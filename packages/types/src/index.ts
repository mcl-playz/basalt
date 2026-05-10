export type MessageKey = {
	mailbox: string;
	uid: number;
};

export interface MessageMetadata extends MessageKey {
	sender: string;
	subject: string;
	date: Date;
	read: boolean;
}

export interface MessageBody extends MessageKey {
	text?: string;
	html?: string;
}

export interface Message extends MessageMetadata, MessageBody {}

export interface Mailbox {
	path: string;
	name: string;
	delimiter: string;
}
