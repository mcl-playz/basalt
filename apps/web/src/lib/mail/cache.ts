import type { Message, MessageKey } from "@basalt/types";
import { Dexie } from "dexie";
import { client } from "$lib/orpc";
import { type DexieMessageKey, db } from "./db";

class MessageCache {
	async get(mailbox: string, uid: number): Promise<Message | undefined> {
		return db.messages.get([mailbox, uid]);
	}

	async getByMailbox(mailbox: string): Promise<Message[]> {
		return db.messages
			.where("[mailbox+date]")
			.between([mailbox, Dexie.minKey], [mailbox, Dexie.maxKey])
			.reverse()
			.toArray();
	}

	async put(message: Message) {
		return db.messages.put(message);
	}
	async bulkPut(messages: Message[]) {
		return db.messages.bulkPut(messages);
	}
	async delete(mailbox: string, uid: number) {
		return db.messages.delete([mailbox, uid]);
	}
	async bulkDelete(keys: MessageKey[]) {
		return db.messages.bulkDelete(
			keys.map((key) => [key.mailbox, key.uid] as DexieMessageKey),
		);
	}
	async clear() {
		return db.messages.clear();
	}

	async sync(
		mailbox: string,
	): Promise<{ added: Message[]; removed: MessageKey[] }> {
		const { messages: incoming } = await client.mail.getMessages({
			mailboxPath: mailbox,
			bodies: false,
		});

		const serverUids = new Set(incoming.map((m) => m.uid));
		const cachedKeys = (await db.messages
			.where("[mailbox+date]")
			.between([mailbox, Dexie.minKey], [mailbox, Dexie.maxKey])
			.primaryKeys()) as DexieMessageKey[];
		const cachedUids = new Set(cachedKeys.map(([, uid]) => uid));

		const removed = cachedKeys
			.filter(([, uid]) => !serverUids.has(uid))
			.map(([mb, uid]) => ({ mailbox: mb, uid }));
		if (removed.length > 0) await this.bulkDelete(removed);

		const refreshed = incoming.filter((m) => cachedUids.has(m.uid));
		if (refreshed.length > 0) {
			const existing = await db.messages.bulkGet(
				refreshed.map((m) => [mailbox, m.uid] as DexieMessageKey),
			);
			const merged = refreshed.map((m, i) => ({
				...m,
				text: existing[i]?.text ?? m.text,
				html: existing[i]?.html ?? m.html,
			}));
			await db.messages.bulkPut(merged);
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
			await db.messages.bulkPut(added);
		}

		return { added, removed };
	}
}

export const cache = new MessageCache();
