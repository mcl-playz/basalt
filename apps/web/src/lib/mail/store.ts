import type { Message, MessageKey } from "@basalt/types";
import { Dexie, type Table } from "dexie";

export type DexieMessageKey = [MessageKey["mailbox"], MessageKey["uid"]];

class MessageDatabase extends Dexie {
	messages!: Table<Message, DexieMessageKey>;

	constructor() {
		super("basalt");

		this.version(2).stores({
			messages: "[mailbox+uid], [mailbox+date]",
		});
	}
}

class MessageStore {
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

	async getKeysByMailbox(mailbox: string): Promise<DexieMessageKey[]> {
		return (await db.messages
			.where("[mailbox+date]")
			.between([mailbox, Dexie.minKey], [mailbox, Dexie.maxKey])
			.primaryKeys()) as DexieMessageKey[];
	}

	async bulkGet(keys: MessageKey[]): Promise<(Message | undefined)[]> {
		return db.messages.bulkGet(
			keys.map((k) => [k.mailbox, k.uid] as DexieMessageKey),
		);
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
}

export const db = new MessageDatabase();
export const store = new MessageStore();
