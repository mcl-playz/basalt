import type { Message } from "@basalt/types";
import { cache } from "./cache";
import { search } from "./search";

class MessageStore {
	// in-memory memo so re-opening a tab is instant (no IndexedDB round-trip).
	private memo = new Map<string, Message>();

	private memoKey(mailbox: string, uid: number) {
		return `${mailbox}:${uid}`;
	}

	// syncs a mailbox, updates both cache and search index
	async syncMailbox(path: string): Promise<Message[]> {
		const { added, removed } = await cache.sync(path);

		search.bulkUnindex(removed);
		search.bulkIndex(added);

		// invalidate memo entries removed from cache
		for (const key of removed)
			this.memo.delete(this.memoKey(key.mailbox, key.uid));
		// pre-warm memo with newly added messages
		for (const msg of added)
			this.memo.set(this.memoKey(msg.mailbox, msg.uid), msg);

		return cache.getByMailbox(path);
	}

	// synchronous peek into the in-memory memo; returns undefined on miss
	peekMessage(mailbox: string, uid: number): Message | undefined {
		return this.memo.get(this.memoKey(mailbox, uid));
	}

	async getMessage(
		mailbox: string,
		uid: number,
	): Promise<Message | undefined> {
		const key = this.memoKey(mailbox, uid);
		const memoed = this.memo.get(key);
		if (memoed) return memoed;

		const result = await cache.get(mailbox, uid);
		if (result) this.memo.set(key, result);
		return result;
	}

	// reads from cache
	async getMessages(path: string): Promise<Message[]> {
		return cache.getByMailbox(path);
	}

	// removes from cache + search index together
	async removeMessage(mailbox: string, uid: number) {
		await cache.delete(mailbox, uid);
		search.unindex(mailbox, uid);
		this.memo.delete(this.memoKey(mailbox, uid));
	}

	// delegates to search
	async search(query: string, limit?: number): Promise<Message[]> {
		return search.search(query, limit);
	}

	// request permission to prevent data eviction
	async requestPersistentStorage() {
		if (navigator.storage?.persist) {
			await navigator.storage.persist();
		}
	}
}

export const store = new MessageStore();
