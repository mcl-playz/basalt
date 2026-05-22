<script lang="ts">
import type { Message as MessageType } from "@basalt/types";
import { toast } from "svelte-sonner";
import { goto } from "$app/navigation";
import { authClient } from "$lib/auth";
import MessageCard from "$lib/components/mail/MessageCard.svelte";
import { mail } from "$lib/mail";
import { loader } from "$lib/state/loader.svelte";
import { getMailboxState } from "$lib/state/mailbox.svelte";
import { getTabState } from "$lib/state/tabs.svelte";
import Message from "./message.svelte";

const sessionQuery = authClient.useSession();
const tabState = getTabState();
const mailboxState = getMailboxState();

$effect(() => {
	if (!$sessionQuery.isPending && !$sessionQuery.data) {
		goto("/login");
	}
});

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

	mail.getMessages(path).then((cached) => {
		if (cancelled) return;
		messages = cached;
		if (cached.length > 0) listLoading = false;
	});

	loader
		.track(mail.getMessages(path))
		.then((fresh) => {
			if (cancelled) return;
			messages = fresh;
		})
		.catch((err) => {
			if (cancelled) return;
			loader.reset();
			console.warn("Failed to refresh mailbox", path, err);
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
				onclick={() => handleMessageSelect(message)}
				ondelete={(m) => {
					messages = messages.filter((x) => x.uid !== m.uid);
					toast.success("Successfully deleted message");
				}}
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
