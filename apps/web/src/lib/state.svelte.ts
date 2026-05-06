import { getContext, setContext } from "svelte";

interface BaseTab {
	id: number;
}

interface MessageTab extends BaseTab {
	type: "message";
	mailbox: string;
	uid: number;
	subject: string;
}

interface AttachmentTab extends BaseTab {
	type: "attachment";
	file: string;
    fileName: string;
}

type Tab = MessageTab | AttachmentTab;
type TabInput = Omit<MessageTab, "id">;

class MailboxState {
	selected = $state<string>();

	select(path: string) {
		this.selected = path;
	}
}

class TabState {
	public activeTabId = $state<number | null>(null);
	public tabs = $state<Tab[]>([]);

	private nextId = 0;

	new(tab: TabInput) {
		// don't open duplicates
		const existing = this.tabs.find(
			(t) =>
				t.type === tab.type &&
				t.uid === (tab as any).uid &&
				t.mailbox === (tab as any).mailbox,
		);
		if (existing) {
			this.select(existing.id);
			return;
		}

		const newTab = { ...tab, id: this.nextId++ } as Tab;
		this.tabs.push(newTab);
		this.select(newTab.id);
	}

	close(tabId: number) {
		this.tabs = this.tabs.filter((t) => t.id !== tabId);
		if (this.activeTabId === tabId) {
			this.select(this.tabs.at(-1)?.id ?? null);
		}
	}

	select(tabId: number | null) {
        if(tabId === null) this.activeTabId = tabId;
		if (!this.tabs.find((t) => t.id === tabId))
			throw new Error(`Tab ${tabId} not found`);
		this.activeTabId = tabId;
	}

	get activeTab() {
		return this.tabs.find((t) => t.id === this.activeTabId) ?? null;
	}
}

const TAB_STATE_KEY = Symbol("tab");
const MAILBOX_STATE_KEY = Symbol("mailbox");

export function setTabState() {
	return setContext(TAB_STATE_KEY, new TabState());
}

export function getTabState() {
	return getContext<TabState>(TAB_STATE_KEY);
}

export function setMailboxState(){
    return setContext(MAILBOX_STATE_KEY, new MailboxState());
}

export function getMailboxState(){
    return getContext<MailboxState>(MAILBOX_STATE_KEY);
}