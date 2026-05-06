import { getContext, setContext } from "svelte";

interface BaseTab {
	id: number;
}

interface MessageTab extends BaseTab {
	type: "message";
	uid: number;
	mailbox: string;
	subject: string;
}

type Tab = MessageTab;
type TabInput = Omit<Tab, "id">;

class MailboxState {
	selected = $state<string>();

	select(path: string) {
		this.selected = path;
	}
}

class TabState {
	public mailboxState = new MailboxState();
	public activeTabId = $state<number | null>(null);
	public tabs = $state<Tab[]>([]);

	private nextId = 0;

	open(tab: TabInput) {
		// don't open duplicates
		const existing = this.tabs.find(
			(t) =>
				t.type === tab.type &&
				t.uid === (tab as any).uid &&
				t.mailbox === (tab as any).mailbox,
		);
		if (existing) {
			this.activeTabId = existing.id;
			return;
		}

		const newTab = { ...tab, id: this.nextId++ } as Tab;
		this.tabs.push(newTab);
		this.activeTabId = newTab.id;
	}

	close(tabId: number) {
		this.tabs = this.tabs.filter((t) => t.id !== tabId);
		if (this.activeTabId === tabId) {
			this.activeTabId = this.tabs.at(-1)?.id ?? null;
		}
	}

	select(tabId: number) {
		if (!this.tabs.find((t) => t.id === tabId))
			throw new Error(`Tab ${tabId} not found`);
		this.activeTabId = tabId;
	}

	get activeTab() {
		return this.tabs.find((t) => t.id === this.activeTabId) ?? null;
	}
}

const KEY = Symbol("tab");

export function setTabState() {
	return setContext(KEY, new TabState());
}

export function getTabState() {
	return getContext<TabState>(KEY);
}
