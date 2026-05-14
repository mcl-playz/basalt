<script lang="ts">
	import { store } from "$lib/message/store";
	import { orpc } from "$lib/orpc";
	import { getTabState } from "$lib/state.svelte";
	import { type MessageMetadata } from "@basalt/types";
	import { createQuery } from "@tanstack/svelte-query";
	import { Button, Checkbox } from "bits-ui";
	import { CheckIcon, EnvelopeIcon, EnvelopeOpenIcon } from "phosphor-svelte";
	import type { MouseEventHandler } from "svelte/elements";

	let {
		message,
		onclick,
        ondelete,
	}: {
		message: MessageMetadata;
		onclick: MouseEventHandler<HTMLButtonElement>;
        ondelete?: (msg: MessageMetadata) => void;
	} = $props();

    let tabState = getTabState();

	const dateObj = $derived(
		message.date instanceof Date ? message.date : new Date(message.date),
	);

	const isToday = (date: Date) => {
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	};

	const isThisYear = (date: Date) => {
		return date.getFullYear() === new Date().getFullYear();
	};

	const formatTime = new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});

	const formatDate = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
	});

	const formatDateWithYear = new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	const deleteMessage = async (e: MouseEvent) => {
		e.stopPropagation();
        const tab = tabState.tabs.find(
            t => t.type === "message" &&
            t.mailbox === message.mailbox &&
            t.uid === message.uid
        )?.id;

		if(tab) tabState.close(tab);
	    store.removeMessage(message.mailbox, message.uid);
        ondelete?.(message)

        try {
            await orpc.mail.deleteMessage.call({
                mailbox: message.mailbox,
                uid: message.uid,
            });
        } catch (error) {
            console.error(error);
        }
	};

	const toggleRead = (e: MouseEvent) => {
		e.stopPropagation();
		console.log("Toggling read status for", message.uid);
	};

	let initial = $derived(message.sender.charAt(0).toUpperCase());
	let isUnread = $derived(!message.read);
</script>

<button
	class="text-left w-full h-11 group flex items-center gap-4 px-3 py-2 transition-colors cursor-pointer
    {message.read == false
		? 'bg-neutral-800/75'
		: 'hover:bg-neutral-800/40'} hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.25)]"
	{onclick}
>
	<div class="flex items-center gap-3">
		<Checkbox.Root
			class="group/check text-sm font-medium size-7"
			onclick={(e) => e.stopPropagation()}
		>
			{#snippet children({ checked })}
				<div>
					<!-- Initial is hidden if checked or if it is hovered -->
					<span
						class={checked
							? "hidden"
							: "block group-hover/check:hidden"}
					>
						{initial}
					</span>

					<!-- Checkmark is shown if checked OR if the initial is hovered -->
					<div
						class={checked
							? "block"
							: "hidden group-hover/check:block"}
					>
						<CheckIcon class="size-4" weight="bold" />
					</div>
				</div>
			{/snippet}
		</Checkbox.Root>
	</div>

	<div
		class="w-48 shrink-0 truncate text-sm {isUnread
			? 'text-neutral-100 font-semibold'
			: 'text-neutral-400 font-normal'}"
	>
		{message.sender}
	</div>

	<div
		class="flex-1 truncate text-sm {isUnread
			? 'text-neutral-200 font-medium'
			: 'text-neutral-500'}"
	>
		{message.subject}
	</div>

	<div class="flex items-center gap-2 min-w-25 justify-end">
		<div class="hidden group-hover:flex items-center gap-1">
			<Button.Root
				onclick={toggleRead}
				title={isUnread ? "Mark as read" : "Mark as unread"}
				class="hover:bg-neutral-700"
				data-minimal
			>
				{#if isUnread}
					<EnvelopeOpenIcon />
				{:else}
					<EnvelopeIcon />
				{/if}
			</Button.Root>

			<Button.Root
				onclick={deleteMessage}
				class="hover:bg-red-900/30 hover:text-red-500"
				title="Delete"
				data-minimal
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M3 6h18" /><path
						d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
					/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg
				>
			</Button.Root>
		</div>

		<span
			class="text-xs text-neutral-500 whitespace-nowrap group-hover:hidden"
		>
			{#if isToday(dateObj)}
				{formatTime.format(dateObj)}
			{:else if isThisYear(dateObj)}
				{formatDate.format(dateObj)}
			{:else}
				{formatDateWithYear.format(dateObj)}
			{/if}
		</span>
	</div>
</button>
