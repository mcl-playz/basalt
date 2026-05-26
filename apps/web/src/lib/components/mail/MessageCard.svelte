<script lang="ts">
import { type MessageMetadata } from "@basalt/types";
import { Button, Checkbox } from "bits-ui";
import {
	CheckIcon,
	EnvelopeIcon,
	EnvelopeOpenIcon,
	StarIcon,
	TrashIcon,
} from "phosphor-svelte";
import type { MouseEventHandler, ToggleEventHandler } from "svelte/elements";
import { toast } from "svelte-sonner";
import { mail } from "$lib/mail";
import { getTabState } from "$lib/state/tabs.svelte";

let {
	message,
    checked = $bindable(false),
	onclick,
    ontoggle,
}: {
	message: MessageMetadata;
    checked?: boolean;
	onclick?: MouseEventHandler<HTMLButtonElement>;
	ontoggle?: (value: boolean) => void;
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

async function deleteMessage(e: MouseEvent) {
	e.stopPropagation();
	tabState.closeMessage(message);
	try {
		await mail.delete(message);
		toast.success("Successfully deleted message");
	} catch (err) {
		console.error("Failed to delete message", err);
		toast.error("Failed to delete message");
	}
}

function toggleRead(e: MouseEvent) {
	e.stopPropagation();
	mail.setRead(message, !message.read);
}

function toggleStarred(e: MouseEvent) {
	e.stopPropagation();
	mail.setStarred(message, !message.starred);
}

let initial = $derived(message.sender.charAt(0).toUpperCase());
let unread = $derived(!message.read);
let starred = $derived(message.starred);
</script>

<button
	class="text-left w-full h-11 group flex items-center gap-4 px-3 py-2 transition-[background-color,color] cursor-pointer
    {unread
		? 'bg-neutral-800/75'
		: 'hover:bg-neutral-800/40'} hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.25)]
    	{starred ? "bg-amber-500/5!" : ""}"
	{onclick}
>
	<div class="flex items-center gap-3">
		<Checkbox.Root
			class="group/check text-sm font-medium size-7"
			onclick={(e) => e.stopPropagation()}
            bind:checked={checked}
            onCheckedChange={ontoggle}
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
		class="w-48 shrink-0 truncate text-sm {unread
			? 'text-neutral-100 font-semibold'
			: 'text-neutral-400 font-normal'}"
	>
		{message.sender}
	</div>

	<div
		class="flex-1 truncate text-sm {unread
			? 'text-neutral-200 font-medium'
			: 'text-neutral-500'}"
	>
		{message.subject}
	</div>

	<div class="flex items-center gap-2 min-w-25 justify-end">
        <div class="hidden group-hover:flex items-center gap-1">
			<Button.Root
				onclick={toggleStarred}
				title={!starred ? "Star" : "Unstar"}
				class={starred ? "text-amber-500" : ""}
				data-minimal
			>
				<StarIcon
					weight={starred ? "fill" : "regular"}
				/>
			</Button.Root>

            <Button.Root
                onclick={toggleRead}
                title={unread ? "Mark as read" : "Mark as unread"}
                class="hover:bg-neutral-700"
                data-minimal
            >
                {#if unread}
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
                <TrashIcon />
            </Button.Root>
        </div>

		{#if starred}
			<div class="size-1.5 rounded-full bg-amber-400 shrink-0 group-hover:hidden"></div>
		{/if}

        <span class="text-xs text-neutral-500 whitespace-nowrap group-hover:hidden">
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
