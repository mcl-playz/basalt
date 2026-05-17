import { getContext, setContext } from "svelte";

class MailboxState {
	selected = $state<string>();

	select(path: string) {
		this.selected = path;
	}
}

const KEY = Symbol("mailbox");

export function setMailboxState() {
	return setContext(KEY, new MailboxState());
}

export function getMailboxState() {
	return getContext<MailboxState>(KEY);
}
