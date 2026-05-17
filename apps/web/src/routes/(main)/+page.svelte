<script lang="ts">
import type { Message as MessageType } from "@basalt/types";
import { goto } from "$app/navigation";
import { authClient } from "$lib/auth";
import Message from "$lib/components/mail/Message.svelte";
import MessageCard from "$lib/components/mail/MessageCard.svelte";
import { store } from "$lib/mail/store";
import { getMailboxState } from "$lib/state/mailbox.svelte";
import { getTabState } from "$lib/state/tabs.svelte";
	import { toast } from "svelte-sonner";

const sessionQuery = authClient.useSession();
const tabState = getTabState();
const mailboxState = getMailboxState();

$effect(() => {
	if (!$sessionQuery.isPending && !$sessionQuery.data) {
		goto("/login");
	}
});

// ---- mailbox list ----
let messages = $state<MessageType[]>([]);
let messagesPath = $state<string | null>(null);
let listLoading = $state(true);

$effect(() => {
	const path = mailboxState.selected;
	if (!path) return;

	listLoading = true;
	let cancelled = false;
	if (messagesPath !== path) {
		messages = [];
		messagesPath = path;
	}

	store.getMessages(path).then((cached) => {
		if (cancelled) return;
		messages = cached;
		if (cached.length > 0) listLoading = false;
	});

	store
		.syncMailbox(path)
		.then((fresh) => {
			if (cancelled) return;
			messages = fresh;
		})
		.catch((err) => {
			if (cancelled) return;
			console.error("Failed to refresh mailbox", path, err);
		})
		.finally(() => {
			if (!cancelled) listLoading = false;
		});

	return () => {
		cancelled = true;
	};
});

function handleMessageSelect(msg: MessageType) {
	tabState.new({
		type: "message",
		mailbox: msg.mailbox,
		uid: msg.uid,
		title: msg.subject,
	});
}

// ---- active message tab ----
let activeMessage = $state<MessageType>();
let messageLoading = $state(false);
let messageError = $state<string | null>(null);

$effect(() => {
	const tab = tabState.activeTab;
	if (!tab || tab.type !== "message") {
		activeMessage = undefined;
		messageLoading = false;
		messageError = null;
		return;
	}

	const memoed = store.peekMessage(tab.mailbox, tab.uid);
	if (memoed) {
		activeMessage = memoed;
		messageLoading = false;
		messageError = null;
		return;
	}

	let cancelled = false;
	messageLoading = true;
	messageError = null;
	activeMessage = undefined;

	store
		.getMessage(tab.mailbox, tab.uid)
		.then((result) => {
			if (cancelled) return;
			if (!result) {
				messageError = "Message not found";
				return;
			}
			activeMessage = result;
		})
		.catch((err) => {
			if (cancelled) return;
			console.error("Failed to load message", err);
			messageError = "Failed to load message";
		})
		.finally(() => {
			if (!cancelled) messageLoading = false;
		});

	return () => {
		cancelled = true;
	};
});
</script>

{#if tabState.activeTab?.type === "message"}
	{#if messageLoading}
		<div
			class="flex flex-col items-center justify-center h-32 text-neutral-500"
		>
			<i>Loading...</i>
		</div>
	{:else if messageError}
		<div
			class="flex flex-col items-center justify-center h-32 text-neutral-500"
		>
			<i>{messageError}</i>
		</div>
	{:else if activeMessage}
        <Message message={activeMessage} />
	{/if}
{:else if tabState.activeTab?.type === "attachment"}
	<div>attachment</div>
{:else if messages.length > 0}
	<div>
		{#each messages as message (message.uid)}
			<MessageCard
				{message}
				onclick={() => handleMessageSelect(message)}
                ondelete={(m) => {
                    messages = messages.filter(x => x.uid !== m.uid)
                    toast.success("Successfully deleted message")
                }}
			/>
		{/each}
	</div>
{:else if listLoading}
	<div
		class="flex flex-col items-center justify-center h-32 text-neutral-500"
	>
		<i>Loading...</i>
	</div>
{:else}
	<div
		class="flex flex-col items-center justify-center h-32 text-neutral-500"
	>
		<i>{mailboxState.selected} is empty.</i>
	</div>
{/if}
