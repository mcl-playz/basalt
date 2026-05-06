<script lang="ts">
	import { goto } from "$app/navigation";
	import { authClient } from "$lib/auth-client";
	import MessageCard from "$lib/components/MessageCard.svelte";
	import { store } from "$lib/message/store";
	import { getMailboxState, getTabState } from "$lib/state.svelte";
	import type { Message } from "@basalt/types";

	const sessionQuery = authClient.useSession();
	const tabState = getTabState();
	const mailboxState = getMailboxState();

	let messages = $state<Message[]>([]);
	let isLoading = $state(true);
    
	$effect(() => {
		if (!$sessionQuery.isPending && !$sessionQuery.data) {
			goto("/login");
		}
	});

	$effect(() => {
		const path = mailboxState.selected ?? "";

        isLoading = true;
		messages = [];
        let cancelled = false;

		store.getMessages(path).then((cached) => {
			messages = cached;
		});

		store
			.syncMailbox(path)
			.then(async () => {
                if(cancelled) return;
                messages = await store.getMessages(path);
			})
			.catch((err) => {
				console.error("Failed to refresh mailbox", path, err);
			})
			.finally(() => {
				isLoading = false;
			});
        return (() => {
            cancelled = true;
        })
	});

    function handleMessageSelect(msg: Message){
        tabState.new({ type: "message", mailbox: msg.mailbox, uid: msg.uid, subject: msg.subject });
        goto(`/${msg.mailbox.toLocaleLowerCase()}/${msg.uid}`)
    }
</script>

{#if messages.length > 0}
	<div>
		{#each messages as message (message.uid)}
			<MessageCard {message} onclick={() => handleMessageSelect(message)} />
		{/each}
	</div>
{:else if isLoading}
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
