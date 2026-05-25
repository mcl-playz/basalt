import { getContext, setContext } from "svelte";
import { MessageKey } from "$lib/mail/keys";

interface BaseTab {
	id: number;
	title: string;
}

interface MessageTab extends BaseTab {
	type: "message";
	key: MessageKey;
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

	create(tab: TabInput): boolean {
		const existing = this.tabs.find((t) => {
			if (t.type !== tab.type) return false;
			if (tab.type === "attachment" && t.type === "attachment") {
				return t.file === tab.file;
			}
			if (tab.type === "message" && t.type === "message") {
				return MessageKey.equals(t.key, tab.key);
			}
			return false;
		});
		if (existing) {
			this.open(existing.id);
			return false;
		}

		const newTab = { ...tab, id: this.nextId++ } as Tab;
		this.tabs.push(newTab);
		this.open(newTab.id);
        return true;
	}

	close(tabId: number) {
		const idx = this.tabs.findIndex((t) => t.id === tabId);
		this.tabs = this.tabs.filter((t) => t.id !== tabId);
		if (this.activeTabId === tabId) {
			this.open(this.tabs.at(idx)?.id ?? null);
		}
	}

    closeMessage(key: MessageKey) {
        const tab = this.tabs.find(
            (t) => t.type === "message" && MessageKey.equals(t.key, key),
        )?.id;

        if (tab !== undefined) {
            this.close(tab);
        }
    }

	open(tabId: number | null) {
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
