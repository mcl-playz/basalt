import type { MessageKey, MessageMetadata } from "@basalt/types";
import { Dexie, type Table } from "dexie";

export type DexieMessageKey = [MessageKey["mailbox"], MessageKey["uid"]];

class MessageDatabase extends Dexie {
	messages!: Table<MessageMetadata, DexieMessageKey>;

	constructor() {
		super("basalt");

		this.version(1).stores({
			messages:
				"[mailbox+uid], mailbox, uid, sender, subject, date, text, html",
		});
	}
}

export const db = new MessageDatabase();
