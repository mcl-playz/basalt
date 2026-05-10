import type { Message, MessageKey, MessageMetadata } from "@basalt/types";
import { db, type DexieMessageKey } from "./db";
import { client } from "$lib/orpc";

class MessageCache {
	async get(
		mailbox: string,
		uid: number,
	): Promise<Message | undefined> {
		return db.messages.get([mailbox, uid]);
	}

	async getByMailbox(mailbox: string): Promise<Message[]> {
		return db.messages
			.where("mailbox")
			.equals(mailbox)
			.reverse()
			.sortBy("date");
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
	    return db.messages.bulkDelete(keys.map(
			(key) => [key.mailbox, key.uid] as DexieMessageKey,
		));
	}
	async clear() {
		return db.messages.clear();
	}

	// syncs one mailbox against IMAP, returns { added, removed }
	async sync(
		mailbox: string
	): Promise<{ added: Message[]; removed: MessageKey[] }> {
		const { messages } = await client.mail.getMessages({ mailboxPath: mailbox, bodies: true });

		const serverUids = new Set(messages.map((m) => m.uid));

		const cachedKeys = (await db.messages
			.where("mailbox")
			.equals(mailbox)
			.primaryKeys()) as DexieMessageKey[];

		const removedKeys = cachedKeys
            .filter(([, uid]) => !serverUids.has(uid))
            .map(([mailbox, uid]) => ({ mailbox, uid }));

		if (removedKeys.length > 0) await this.bulkDelete(removedKeys);

	    await db.messages.bulkPut(messages);

		const cachedUids = new Set(cachedKeys.map(([, uid]) => uid));
		const added = messages.filter((m) => !cachedUids.has(m.uid));

		return {
			added,
			removed: removedKeys,
		};
	}
}

export const cache = new MessageCache();
