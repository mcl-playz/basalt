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

export const db = new MessageDatabase();
