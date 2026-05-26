import type { MessageKey as MessageKeyType } from "@basalt/types";

export type MessageKey = MessageKeyType;

export namespace MessageKey {
	export type Serialized = string & {
        __brand: "SerializedMessageKey";
    };
}

export const MessageKey = {
	serialize(key: MessageKey): MessageKey.Serialized {
		return `${key.mailbox}\0${key.uid}` as MessageKey.Serialized;
	},

	parse(key: MessageKey.Serialized): MessageKey {
		const [mailbox, uid] = key.split("\0");
        if (!mailbox || uid === undefined) {
            throw new Error("Invalid serialized MessageKey");
        }
		return { mailbox, uid: Number(uid) };
	},

    equals(a: MessageKey, b: MessageKey): boolean {
        return a.mailbox === b.mailbox && a.uid === b.uid;
    }
} as const;