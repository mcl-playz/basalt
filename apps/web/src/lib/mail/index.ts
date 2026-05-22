import type { Message } from "@basalt/types";
import { cache } from "./cache";
import { search } from "./search";

const SYNC_TTL_MS = 30_000;
const MEMO_LIMIT = 200;

class Mail {
	private memo = new Map<string, Message>();
	private lastSync = new Map<string, number>();
	private inflight = new Map<string, Promise<Message[]>>();

	private getMemoKey(mailbox: string, uid: number) {
		return `${mailbox}:${uid}`;
	}

	private rememberMessage(message: Message) {
		const key = this.getMemoKey(message.mailbox, message.uid);
		if (this.memo.has(key)) this.memo.delete(key);
		this.memo.set(key, message);
		if (this.memo.size > MEMO_LIMIT) {
			const oldest = this.memo.keys().next().value;
			if (oldest !== undefined) this.memo.delete(oldest);
		}
	}

	async syncMailbox(path: string, force = false): Promise<Message[]> {
		const inflight = this.inflight.get(path);
		if (inflight) return inflight;

		const last = this.lastSync.get(path) ?? 0;
		if (!force && Date.now() - last < SYNC_TTL_MS) {
			return cache.getByMailbox(path);
		}

		const promise = (async () => {
			const { added, removed } = await cache.sync(path);

			search.bulkUnindex(removed);
			search.bulkIndex(added);

			for (const key of removed)
				this.memo.delete(this.getMemoKey(key.mailbox, key.uid));
			for (const msg of added) this.rememberMessage(msg);

			this.lastSync.set(path, Date.now());
			return cache.getByMailbox(path);
		})();

		this.inflight.set(path, promise);
		try {
			return await promise;
		} finally {
			this.inflight.delete(path);
		}
	}

	peekMessage(mailbox: string, uid: number): Message | undefined {
		return this.memo.get(this.getMemoKey(mailbox, uid));
	}

	async getMessage(
		mailbox: string,
		uid: number,
	): Promise<Message | undefined> {
		const memoed = this.peekMessage(mailbox, uid);
		if (memoed) return memoed;

		const result = await cache.get(mailbox, uid);
		if (result) this.rememberMessage(result);
		return result;
	}

	async getMessages(path: string): Promise<Message[]> {
		return cache.getByMailbox(path);
	}

	async removeMessage(mailbox: string, uid: number) {
		await cache.delete(mailbox, uid);
		search.unindex(mailbox, uid);
		this.memo.delete(this.getMemoKey(mailbox, uid));
	}

	async search(query: string, limit?: number): Promise<Message[]> {
		return search.search(query, limit);
	}

	async requestPersistentStorage() {
		if (navigator.storage?.persist) {
			await navigator.storage.persist();
		}
	}
}

export const mail = new Mail();
