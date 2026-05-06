import type { Message, MessageMetadata } from "@basalt/types";
import { cache } from "./cache";
import { search } from "./search"

class MessageStore {
    // syncs a mailbox, updates both cache and search index
	async syncMailbox(path: string): Promise<Message[]> {
        const { added, removed } = await cache.sync(path);

        search.bulkUnindex(removed);
        search.bulkIndex(added);

        return cache.getByMailbox(path);
    }

    async getMessage(mailbox: string, uid: number): Promise<Message | undefined> {
        return cache.get(mailbox, uid);
    }

    // reads from cache
	async getMessages(path: string): Promise<Message[]> {
        return cache.getByMailbox(path);
    }

    // removes from cache + search index together
	async removeMessage(mailbox: string, uid: number) {
        await cache.delete(mailbox, uid);
        search.unindex(mailbox, uid);
    }

    // delegates to search
	async search(query: string, limit?: number): Promise<Message[]> {
        return search.search(query, limit);
    }

    // request permission to prevent data eviction
    async requestPersistentStorage() {
        if (navigator.storage?.persist) {
            await navigator.storage.persist();
        }
    }
}

export const store = new MessageStore();