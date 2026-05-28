<script lang="ts">
import { Button, Toolbar } from "bits-ui";
import {
	ArrowCircleRightIcon,
	EnvelopeIcon,
	EnvelopeOpenIcon,
	StarIcon,
	TrashIcon,
	XIcon,
} from "phosphor-svelte";
import { getSelectionState } from "$lib/state/selection.svelte";
import { type Message } from "@basalt/types";
import { mail } from "$lib/mail";
import ToolbarSeparator from "@basalt/ui-kit/components/ToolbarSeparator";

const selectionState = getSelectionState();

const count = $derived(selectionState.selected.length);
let selectedMessages: Message[] = $state([]);

$effect(() => {
	getSelectedMessages().then((a) => (selectedMessages = a));
});

async function getSelectedMessages() {
	return (
		await Promise.all(selectionState.selected.map((key) => mail.get(key)))
	).filter((m): m is Message => m !== undefined);
}

function getMajority<T>(items: T[], getState: (item: T) => boolean) {
	const trueCount = items.filter(getState).length;
	return trueCount >= items.length - trueCount;
}

function handleMajorityToggle<T>(
	items: T[],
	getState: (item: T) => boolean,
	setState: (item: T, value: boolean) => Promise<void>,
) {
	const shouldSetFalse = getMajority<T>(items, getState);

	return Promise.all(
		items.map((item) =>
			setState(item, !shouldSetFalse).catch((err) => {
				console.error("Batch update failed", err);
			}),
		),
	);
}

const starMajority = $derived(getMajority<Message>(selectedMessages, (m) => m.starred));
const readMajority = $derived(getMajority<Message>(selectedMessages, (m) => m.read));
</script>

<Toolbar.Root
	class="flex h-12 items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900/95 px-2 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md"
>
	<div class="flex items-center gap-1.5 pl-2 pr-1 text-sm text-neutral-200">
		<span class="font-semibold tabular-nums">{count}</span>
		<span class="text-neutral-500">selected</span>
	</div>

	<ToolbarSeparator />

	<Toolbar.Button
		title={readMajority ? "Mark as unread" : "Mark as read"}
        onclick={() => handleMajorityToggle<Message>(selectedMessages, (m) => m.read, (m, value) => mail.setRead(m, value))}
	>
        {#if readMajority}
            <EnvelopeIcon />
        {:else}
		    <EnvelopeOpenIcon />
        {/if}
	</Toolbar.Button>

	<Toolbar.Button
		title={starMajority ? "Unstar" : "Star"}
        onclick={() => handleMajorityToggle<Message>(selectedMessages, (m) => m.starred, (m, value) => mail.setStarred(m, value))}
		class="hover:bg-amber-500/15 hover:text-amber-400"
	>
		<StarIcon weight={starMajority ? "fill" : "regular"} />
	</Toolbar.Button>

	<Toolbar.Button
		title="Move"
	>
		<ArrowCircleRightIcon />
	</Toolbar.Button>

	<Toolbar.Button
		title="Delete"
        onclick={() => {selectedMessages.forEach(m => mail.delete(m)); selectionState.clear()}}
		class="hover:bg-red-500/15 hover:text-red-400"
	>
		<TrashIcon />
	</Toolbar.Button>

    <ToolbarSeparator />

	<Button.Root
		title="Clear selection"
		onclick={() => selectionState.clear()}
		class=""
	>
		<XIcon />
	</Button.Root>
</Toolbar.Root>
