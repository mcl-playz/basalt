import type { Message, MessageKey } from "@basalt/types";
import { client } from "$lib/orpc";
import { search } from "./search";
import { store } from "./store";

const SYNC_TTL_MS = 30_000;
const MEMO_LIMIT = 200;

class Mail {
	private cache = new Map<string, Message>();
	private lastSync = new Map<string, number>();
	private inflight = new Map<string, Promise<Message[]>>();

	private getCacheKey(mailbox: string, uid: number) {
		return `${mailbox}:${uid}`;
	}

	private remember(msg: Message) {
		const key = this.getCacheKey(msg.mailbox, msg.uid);
		if (this.cache.has(key)) this.cache.delete(key);
		this.cache.set(key, msg);
		if (this.cache.size > MEMO_LIMIT) {
			const oldest = this.cache.keys().next().value;
			if (oldest !== undefined) this.cache.delete(oldest);
		}
	}

	private forget(mailbox: string, uid: number) {
		this.cache.delete(this.getCacheKey(mailbox, uid));
	}

	private peek(mailbox: string, uid: number): Message | undefined {
		return this.cache.get(this.getCacheKey(mailbox, uid));
	}

	async get(mailbox: string, uid: number): Promise<Message | undefined> {
		const hot = this.peek(mailbox, uid);
		if (hot) return hot;

		const local = await store.get(mailbox, uid);
		if (local) {
			this.remember(local);
			return local;
		}

		const { message } = await client.mail.getMessage({ mailbox, uid });
		if (!message) return undefined;

		const fetched = message as Message;
		await store.put(fetched);
		search.index(fetched);
		this.remember(fetched);
		return fetched;
	}

	async getMessages(path: string, force = false): Promise<Message[]> {
		const inflight = this.inflight.get(path);
		if (inflight) return inflight;

		const last = this.lastSync.get(path) ?? 0;
		if (!force && Date.now() - last < SYNC_TTL_MS) {
			return store.getByMailbox(path);
		}

		const promise = (async () => {
			const { added, removed } = await this.sync(path);

			search.bulkUnindex(removed);
			search.bulkIndex(added);

			for (const key of removed) this.forget(key.mailbox, key.uid);
			for (const msg of added) this.remember(msg);

			this.lastSync.set(path, Date.now());
			return store.getByMailbox(path);
		})();

		this.inflight.set(path, promise);
		try {
			return await promise;
		} finally {
			this.inflight.delete(path);
		}
	}

	private async sync(
		mailbox: string,
	): Promise<{ added: Message[]; removed: MessageKey[] }> {
		const { messages: incoming } = await client.mail.getMessages({
			mailboxPath: mailbox,
			bodies: false,
		});

		const serverUids = new Set(incoming.map((m) => m.uid));
		const cachedKeys = await store.getKeysByMailbox(mailbox);
		const cachedUids = new Set(cachedKeys.map(([, uid]) => uid));

		const removed = cachedKeys
			.filter(([, uid]) => !serverUids.has(uid))
			.map(([mb, uid]) => ({ mailbox: mb, uid }));
		if (removed.length > 0) await store.bulkDelete(removed);

		const refreshed = incoming.filter((m) => cachedUids.has(m.uid));
		if (refreshed.length > 0) {
			const existing = await store.bulkGet(
				refreshed.map((m) => ({ mailbox, uid: m.uid })),
			);
			const merged = refreshed.map((m, i) => ({
				...m,
				text: existing[i]?.text ?? m.text,
				html: existing[i]?.html ?? m.html,
			}));
			await store.bulkPut(merged);
		}

		const newUids = incoming
			.filter((m) => !cachedUids.has(m.uid))
			.map((m) => m.uid);
		let added: Message[] = [];
		if (newUids.length > 0) {
			const { messages: fetched } = await client.mail.getMessages({
				mailboxPath: mailbox,
				bodies: true,
				uids: newUids,
			});
			added = fetched as Message[];
			await store.bulkPut(added);
		}

		return { added, removed };
	}

	async delete(mailbox: string, uid: number, permanent = false) {
		await store.delete(mailbox, uid);
		search.unindex(mailbox, uid);
		this.forget(mailbox, uid);

		try {
			await client.mail.deleteMessage({ mailbox, uid, permanent });
		} catch (err) {
			this.lastSync.delete(mailbox);
			this.getMessages(mailbox, true).catch(() => {});
			throw err;
		}
	}

    async clear(){
        this.cache.clear();
        this.lastSync.clear()
        this.inflight.clear();
        search.clear();
        await store.clear();
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
