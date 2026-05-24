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

export type Tab = MessageTab | AttachmentTab;
export type TabInput = Omit<MessageTab, "id"> | Omit<AttachmentTab, "id">;

class TabState {
	public activeTabId = $state<number | null>(null);
	public tabs = $state<Tab[]>([]);

	private nextId = 0;

	new(tab: TabInput): boolean {
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
			return false;
		}

		const newTab = { ...tab, id: this.nextId++ } as Tab;
		this.tabs.push(newTab);
		this.select(newTab.id);
        return true;
	}

	close(tabId: number) {
		const idx = this.tabs.findIndex((t) => t.id === tabId);
		this.tabs = this.tabs.filter((t) => t.id !== tabId);
		if (this.activeTabId === tabId) {
			this.select(this.tabs.at(idx)?.id ?? null);
		}
	}

    closeMessage(mailbox: string, uid: number) {
        const tab = this.tabs.find(
            (t) => t.type === "message" && t.mailbox === mailbox && t.uid === uid,
        )?.id;

        if (tab !== undefined) {
            this.close(tab);
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

const KEY = Symbol("tabs");

export function setTabState() {
	return setContext(KEY, new TabState());
}

export function getTabState() {
	return getContext<TabState>(KEY);
}
