import { getContext, setContext } from "svelte";

interface BaseTab {
	id: number;
    title: string;
}

interface MessageTab extends BaseTab {
	type: "message";
	mailbox: string;
	uid: number;
}

interface AttachmentTab extends BaseTab {
	type: "attachment";
	file: string;
}

type Tab = MessageTab | AttachmentTab;
type TabInput = Omit<MessageTab, "id"> | Omit<AttachmentTab, "id">;

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
		const existing = this.tabs.find((t) => {
            if (t.type !== tab.type) return false;
            if (tab.type === "attachment" && t.type === "attachment") {
                return t.file === tab.file;
            }
            if (tab.type === "message" && t.type === "message") {
                return t.uid === tab.uid && t.mailbox === tab.mailbox;
            }
            return false;
        });
		if (existing) {
			this.select(existing.id);
			return;
		}

		const newTab = { ...tab, id: this.nextId++ } as Tab;
		this.tabs.push(newTab);
		this.select(newTab.id);
	}

	close(tabId: number) {
        const idx = this.tabs.findIndex((t) => t.id === tabId);
		this.tabs = this.tabs.filter((t) => t.id !== tabId);
		if (this.activeTabId === tabId) {
			this.select(this.tabs.at(idx)?.id ?? null);
		}
	}

	select(tabId: number | null) {
		if (tabId === null) {
			this.activeTabId = null;
			return;
		}
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