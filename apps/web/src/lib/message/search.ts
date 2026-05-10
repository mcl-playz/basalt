import type { Message, MessageKey } from "@basalt/types";
import { Document } from "flexsearch";
import { type DexieMessageKey, db } from "./db";

class MessageSearch {
	readonly idx;
	constructor() {
		this.idx = new Document({
			document: {
				id: "_id",
				index: [
					{ field: "subject", tokenize: "forward" },
					{ field: "sender", tokenize: "forward" },
					// { field: "text", tokenize: "forward" },
				],
			},
		});
	}

	// loads from cache, builds index
	async init() {
		const messages = await db.messages.toArray();
		this.clear();
		this.bulkIndex(messages);
	}

	// adds a message to the index
	index(message: Message) {
		this.idx.add({
			...message,
			_id: `${message.mailbox}\0${message.uid}`,
		} as Message & { _id: string });
	}

	// adds multiple messages to the index
	bulkIndex(messages: Message[]) {
		for (const m of messages) this.index(m);
	}

	// removes a message from the index
	unindex(mailbox: string, uid: number) {
		this.idx.remove(`${mailbox}\0${uid}`);
	}

	// removes multiple messages from the index
	bulkUnindex(keys: MessageKey[]) {
		for (const { mailbox, uid } of keys) this.unindex(mailbox, uid);
	}

	// searches the index for messages
	async search(query: string, limit?: number): Promise<Message[]> {
		const q = query.trim();
		if (!q) return [];

		const results = this.idx.search(q, { limit });
		const ids = new Set<string>();
		for (const r of results) {
			for (const id of r.result) ids.add(id as string);
		}

		const keys = [...ids].map((id) => {
			const [mailbox, uid] = id.split("\0");
			return [mailbox, Number(uid)] as DexieMessageKey;
		});
		const messages = await db.messages.bulkGet(keys);
		return messages.filter((m): m is Message => m !== undefined);
	}

	// clears the index
	clear() {
		this.idx.clear();
	}
}

export const search = new MessageSearch();
