<script lang="ts">
import { createQuery } from "@tanstack/svelte-query";
import "../../app.css";
import type { Mailbox } from "@basalt/types";
import { Button } from "bits-ui";
import {
	CaretDoubleLeftIcon,
	EnvelopeIcon,
	FireIcon,
	FolderIcon,
	MagnifyingGlassIcon,
	PaperclipIcon,
	PaperPlaneTiltIcon,
	PencilIcon,
	ScrollIcon,
	TrashIcon,
	TrayIcon,
} from "phosphor-svelte";
import AccountMenu from "$lib/components/AccountMenu.svelte";
import SearchPopup from "$lib/components/SearchPopup.svelte";
import Tab from "$lib/components/Tab.svelte";
import { search } from "$lib/message/search";
import { orpc } from "$lib/orpc";
import { setMailboxState, setTabState } from "$lib/state.svelte";

const { children } = $props();

const mailboxesQuery = createQuery(orpc.mail.getMailboxes.queryOptions());
const tabState = setTabState();
const mailboxState = setMailboxState();
let mailbox = $state<Mailbox | null>();

$effect(() => {
	const mailboxes = $mailboxesQuery.data?.mailboxes;
	if (!mailboxes || mailboxes.length === 0) return;

	if (!mailboxState.selected) {
		mailboxState.select(mailboxes[0].path);
		mailbox = mailboxes[0];
	} else {
		const match = mailboxes.find((x) => x.path === mailboxState.selected);
		if (match) mailbox = match;
	}

	search.init();
});

const isFolderType = (path: string, type: string) =>
	path.toLowerCase().includes(type.toLowerCase());

function handleMailboxSelect(path: string) {
	const m = $mailboxesQuery.data?.mailboxes.find((x) => x.path === path);
	if (m) mailbox = m;
	mailboxState.select(path);
	tabState.select(null);
}
</script>

<div class="h-screen flex">
    <aside class="w-64 flex flex-col shrink-0">
        <div class="p-4 pr-3 h-14 flex items-center">
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 bg-indigo-600 rounded shadow-lg shadow-indigo-500/20"></div>
                    <span class="font-bold tracking-tight text-white">Basalt</span>
                </div>

                <div class="flex gap-0.5">
                    <SearchPopup>
                        <Button.Root data-minimal class="p-1">
                            <MagnifyingGlassIcon class="size-5" />
                        </Button.Root>
                    </SearchPopup>
                    <Button.Root data-minimal class="p-1">
                        <PencilIcon class="size-5" />
                    </Button.Root>
                </div>
            </div>
        </div>

        <nav class="flex-1 overflow-y-auto p-3 pt-0.5 space-y-1">
            {#each $mailboxesQuery.data?.mailboxes ?? [] as mailbox}
                <Button.Root
                    onclick={() => handleMailboxSelect(mailbox.path)}
                    class="w-full flex text-sm transition-all px-2 py-1.5
                    {mailboxState.selected === mailbox.path
                        ? 'bg-neutral-800/75 text-white font-medium shadow-xsxl'
                        : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'}"
                    data-minimal
                >
                    <div class="flex items-center gap-3">
                        {#if isFolderType(mailbox.path, "inbox")}
                            <TrayIcon size="1.15rem" />
                        {:else if isFolderType(mailbox.path, "sent")}
                            <PaperPlaneTiltIcon size="1.15rem" />
                        {:else if isFolderType(mailbox.path, "drafts")}
                            <ScrollIcon size="1.15rem" />
                        {:else if isFolderType(mailbox.path, "spam")}
                            <FireIcon size="1.15rem" />
                        {:else if isFolderType(mailbox.path, "trash")}
                            <TrashIcon size="1.15rem" />
                        {:else}
                            <FolderIcon size="1.15rem" />
                        {/if}
                        {mailbox.name}
                    </div>
                </Button.Root>
            {/each}
        </nav>

        <div class="p-2 flex justify-between">
            <AccountMenu />
            <Button.Root data-minimal class="pr-2 text-neutral-500 hover:text-white">
                <CaretDoubleLeftIcon size="1rem" />
            </Button.Root>
        </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
        <!-- Header -->
        <header class="flex items-center py-2 z-10 m-0 min-w-0">
            <div class="flex justify-start gap-1.5 overflow-x-auto w-full min-w-0 pr-1.5">
                <Tab icon={TrayIcon} title={mailbox?.name ?? ""} selected={tabState.activeTabId === null} closeBtn={false} shrink={false} open={() => tabState.select(null)}/>
                {#each tabState.tabs as tab}
                    <Tab
                        icon={tab.type == "message" ? EnvelopeIcon : PaperclipIcon}
                        title={tab.title} selected={tabState.activeTabId === tab.id}
                        open={() => tabState.select(tab.id)}
                        close={() => tabState.close(tab.id)}
                    />
                {/each}
            </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto rounded-lg bg-neutral-900 mr-2 mb-2">
            {@render children()}
        </main>
    </div>
</div>
