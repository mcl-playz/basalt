import type { Message } from "@basalt/types";
import { client } from "$lib/orpc";
import { search } from "./search";
import { store } from "./store";
import { MessageKey } from "./keys";

const SYNC_TTL_MS = 30_000;

class Mail {
	lists = $state<Record<string, Message[]>>({});

	private lastSync = new Map<string, number>();
	private inflightList = new Map<string, Promise<Message[]>>();
	private inflightGet = new Map<string, Promise<Message | undefined>>();

	private replace({ mailbox, uid }: MessageKey, msg: Message) {
		const list = this.lists[mailbox];
		if (!list) return;
		const i = list.findIndex((m) => m.uid === uid);
		if (i >= 0) list[i] = msg;
	}

	private remove({ mailbox, uid }: MessageKey) {
		const list = this.lists[mailbox];
		if (!list) return;
		this.lists[mailbox] = list.filter((m) => m.uid !== uid);
	}

	private insert(mailbox: string, msg: Message) {
		const list = this.lists[mailbox] ?? [];
		const next = [...list];
		const i = next.findIndex((m) => m.uid === msg.uid);
		if (i >= 0) next[i] = msg;
		else next.push(msg);
		next.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
		);
		this.lists[mailbox] = next;
	}

    peek({ mailbox, uid }: MessageKey): Message | undefined {
		return this.lists[mailbox]?.find((m) => m.uid === uid);
	}

	async get(key: MessageKey): Promise<Message | undefined> {
        const { mailbox, uid } = key;
		const hot = this.peek(key);
		if (hot) return hot;

		const k = MessageKey.serialize(key);
		const existing = this.inflightGet.get(k);
		if (existing) return existing;

		const promise = (async () => {
			try {
				let msg = await store.get(mailbox, uid);
				if (!msg) {
					const { message } = await client.mail.getMessage({
						mailbox,
						uid,
					});
					if (!message) return undefined;
					msg = message as Message;
					await store.put(msg);
					search.index(msg);
				}
				this.insert(mailbox, msg);
				return msg;
			} finally {
				this.inflightGet.delete(k);
			}
		})();

		this.inflightGet.set(k, promise);
		return promise;
	}

	async getMessages(path: string, force = false): Promise<Message[]> {
		const inflight = this.inflightList.get(path);
		if (inflight) return inflight;

		const last = this.lastSync.get(path) ?? 0;
		if (!force && Date.now() - last < SYNC_TTL_MS) {
			if (!this.lists[path]) {
				this.lists[path] = await store.getByMailbox(path);
			}
			return this.lists[path];
		}

		const promise = (async () => {
			const { added, removed } = await this.sync(path);

			search.bulkUnindex(removed);
			search.bulkIndex(added);

			this.lastSync.set(path, Date.now());
			this.lists[path] = await store.getByMailbox(path);
			return this.lists[path];
		})();

		this.inflightList.set(path, promise);
		try {
			return await promise;
		} finally {
			this.inflightList.delete(path);
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

	async delete(key: MessageKey, permanent = false) {
        const { mailbox, uid } = key;
		const previous = this.peek(key);

		await store.delete(key);
		search.unindex(key);
		this.remove(key);

		try {
			await client.mail.deleteMessage({ mailbox, uid, permanent });

			if (!permanent && mailbox !== "Trash") {
				this.lastSync.delete("Trash");
				this.getMessages("Trash", true).catch(() => {});
			}
		} catch (err) {
			if (previous) {
				await store.put(previous);
				this.insert(mailbox, previous);
			}
			this.lastSync.delete(mailbox);
			this.getMessages(mailbox, true).catch(() => {});
			throw err;
		}
	}

	async setFlags(
		key: MessageKey,
		flags: { add?: string[]; remove?: string[] },
	) {
        const { mailbox, uid } = key;
		const current = await this.get(key);
		if (!current) return;

		const willAdd = flags.add ?? [];
		const willRemove = flags.remove ?? [];
		const next: Message = {
			...current,
			read: willAdd.includes("\\Seen")
				? true
				: willRemove.includes("\\Seen")
					? false
					: current.read,
			starred: willAdd.includes("\\Flagged")
				? true
				: willRemove.includes("\\Flagged")
					? false
					: current.starred,
		};

		await store.put(next);
		this.replace(key, next);

		try {
			await client.mail.setFlags({ mailbox, uid, ...flags });
		} catch (err) {
			await store.put(current);
			this.replace(key, current);
			throw err;
		}
	}

	async setRead(key: MessageKey, read: boolean) {
		return this.setFlags(
			key,
			read ? { add: ["\\Seen"] } : { remove: ["\\Seen"] },
		);
	}

	async setStarred(key: MessageKey, flagged: boolean) {
		return this.setFlags(
			key,
			flagged ? { add: ["\\Flagged"] } : { remove: ["\\Flagged"] },
		);
	}

	async clear() {
		this.lists = {};
		this.lastSync.clear();
		this.inflightList.clear();
		this.inflightGet.clear();
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
