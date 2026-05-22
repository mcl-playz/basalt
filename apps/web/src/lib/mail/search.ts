import type { Message, MessageKey } from "@basalt/types";
import { Document } from "flexsearch";
import { type DexieMessageKey, db } from "./store";

class MessageSearch {
	readonly idx;
	private initPromise: Promise<void> | null = null;

	constructor() {
		this.idx = new Document({
			document: {
				id: "_id",
				index: [
					{ field: "subject", tokenize: "forward" },
					{ field: "sender", tokenize: "forward" },
					{ field: "text", tokenize: "forward" },
				],
			},
		});
	}

	init(): Promise<void> {
		if (this.initPromise) return this.initPromise;
		this.initPromise = (async () => {
			const BATCH = 200;
			let offset = 0;
			while (true) {
				const batch = await db.messages
					.offset(offset)
					.limit(BATCH)
					.toArray();
				if (batch.length === 0) break;
				for (const m of batch) this.index(m);
				offset += batch.length;
				if (batch.length < BATCH) break;
				await yieldToMain();
			}
		})();
		return this.initPromise;
	}

	index(message: Message) {
		this.idx.add({
			_id: `${message.mailbox}\0${message.uid}`,
			subject: message.subject,
			sender: message.sender,
			text: message.text ?? "",
		});
	}

	bulkIndex(messages: Message[]) {
		for (const m of messages) this.index(m);
	}

	unindex(mailbox: string, uid: number) {
		this.idx.remove(`${mailbox}\0${uid}`);
	}

	bulkUnindex(keys: MessageKey[]) {
		for (const { mailbox, uid } of keys) this.unindex(mailbox, uid);
	}

	async search(query: string, limit?: number): Promise<Message[]> {
		const q = query.trim();
		if (!q) return [];

		const results = this.idx.search(q, { limit });
		const ids = new Set<string>();
		for (const r of results) {
			for (const id of r.result) ids.add(id as string);
		}
		if (ids.size === 0) return [];

		const keys = [...ids].map((id) => {
			const [mailbox, uid] = id.split("\0");
			return [mailbox, Number(uid)] as DexieMessageKey;
		});
		const messages = await db.messages.bulkGet(keys);
		return messages.filter((m): m is Message => m !== undefined);
	}

	clear() {
		this.idx.clear();
		this.initPromise = null;
	}
}

function yieldToMain(): Promise<void> {
	const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } })
		.scheduler;
	if (s?.yield) return s.yield();
	return new Promise((resolve) => setTimeout(resolve, 0));
}

export const search = new MessageSearch();
