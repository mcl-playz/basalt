<script lang="ts">
import type { Message, MessageMetadata } from "@basalt/types";
import { Command, Dialog } from "bits-ui";
import { EnvelopeIcon } from "phosphor-svelte";
import type { Snippet } from "svelte";
import { mail } from "$lib/mail";
import { getTabState } from "$lib/state/tabs.svelte";

let {
	open = $bindable(false),
	children,
}: {
	open?: boolean;
	children: Snippet;
} = $props();

let query = $state("");
let results = $state<MessageMetadata[]>([]);
let tabState = getTabState();

$effect(() => {
	const q = query;
	let cancelled = false;
	mail.search(q).then((r) => {
		if (!cancelled) results = r;
	});
	return () => {
		cancelled = true;
	};
});

function handleSelection(message: Message) {
	open = false;
	tabState.new({
		type: "message",
		mailbox: message.mailbox,
		uid: message.uid,
		title: message.subject,
	});
}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{@render children()}
	</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/60" />
		<Dialog.Content
			class="fixed left-1/2 top-[15%] z-50 w-full max-w-125 -translate-x-1/2 outline-hidden"
            onCloseAutoFocus={(e) => e.preventDefault()}
		>
			<Command.Root shouldFilter={false}>
				<Command.Input
					bind:value={query}
					placeholder="Search for something..."
				/>
				<Command.List>
					<Command.Viewport>
						{#if !query.trim()}
							<Command.Empty>Type to search…</Command.Empty>
						{:else if results.length === 0}
							<Command.Empty>No results found.</Command.Empty>
						{:else}
							<Command.Group>
								<Command.GroupHeading
									>Messages</Command.GroupHeading
								>
								<Command.GroupItems>
									{#each results as message (`${message.mailbox}:${message.uid}`)}
										<Command.Item
											value={`${message.mailbox}:${message.uid}`}
                                            onSelect={() => handleSelection(message)}
										>
											<EnvelopeIcon class="size-4" />
											<div>
												<p
													class="text-xs text-neutral-600"
												>
													{message.sender}
												</p>
												<p>{message.subject}</p>
											</div>
										</Command.Item>
									{/each}
								</Command.GroupItems>
							</Command.Group>
						{/if}
					</Command.Viewport>
				</Command.List>
			</Command.Root>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
