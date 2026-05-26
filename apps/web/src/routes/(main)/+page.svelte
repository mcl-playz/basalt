<script lang="ts">
import { goto } from "$app/navigation";
import { authClient } from "$lib/auth";
import MessageCard from "$lib/components/mail/MessageCard.svelte";
import { mail } from "$lib/mail";
import { loader } from "$lib/state/loader.svelte";
import { getMailboxState } from "$lib/state/mailbox.svelte";
import { getTabState } from "$lib/state/tabs.svelte";
import type { MessageKey, MessageMetadata, Message as MessageType } from "@basalt/types";
import Message from "./message.svelte";
import { getSelectionState } from "$lib/state/selection.svelte";

const sessionQuery = authClient.useSession();
const tabState = getTabState();
const mailboxState = getMailboxState();
const selectionState = getSelectionState();

$effect(() => {
	if (!$sessionQuery.isPending && !$sessionQuery.data) {
		goto("/login");
	}
});

let listLoading = $state(true);

const messages = $derived(
	mailboxState.selected ? (mail.lists[mailboxState.selected] ?? []) : [],
);

$effect(() => {
	const path = mailboxState.selected;
	if (!path) return;

	listLoading = true;
	loader
		.track(mail.getMessages(path))
		.catch((err) => {
			loader.reset();
			console.warn("Failed to refresh mailbox", path, err);
		})
		.finally(() => {
			listLoading = false;
		});
});

function handleMessageOpen(msg: MessageType) {
	const created = tabState.create({
		type: "message",
		key: msg,
		title: msg.subject,
	});
	if (created && !msg.read) {
		mail.setRead(msg, true).catch((err) => {
			console.error("Failed to mark as read", err);
		});
	}
}

function handleMessageSelect(msg: MessageKey, selected: boolean) {
    selectionState.setSelected(msg, selected);
}
</script>

{#if tabState.activeTab?.type === "message"}
	<Message />
{:else if tabState.activeTab?.type === "attachment"}
	<div>attachment</div>
{:else if messages.length > 0}
	<div>
		{#each messages as message (message.uid)}
			<MessageCard
				{message}
				onclick={() => handleMessageOpen(message)}
                checked={selectionState.isSelected(message)}
                ontoggle={(selected) => handleMessageSelect(message, selected)}
			/>
		{/each}
	</div>
{:else}
	<div
		class="flex flex-col items-center justify-center h-32 text-neutral-500"
	>
		<i>{mailboxState.selected} is empty.</i>
	</div>
{/if}
