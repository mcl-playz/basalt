<script lang="ts">
import type { Message } from "@basalt/types";
import DropdownItem from "@basalt/ui-kit/components/DropdownItem";
import { Button, DropdownMenu } from "bits-ui";
import {
	ArrowBendDoubleUpLeftIcon,
	ArrowBendUpLeftIcon,
	ArrowRightIcon,
	CaretDownIcon,
	EnvelopeIcon,
	EnvelopeOpenIcon,
	FileIcon,
	GlobeIcon,
	PrinterIcon,
	StarIcon,
	TrashIcon,
} from "phosphor-svelte";
import template from "$lib/mail/iframe.html?raw";
import { mail } from "$lib/mail";
import { loader } from "$lib/state/loader.svelte";
import { getTabState } from "$lib/state/tabs.svelte";

const tabState = getTabState();

let iframeEl: HTMLIFrameElement | undefined = $state();
let iframeHeight = $state(0);
let loaded = $state<Message>();
let messageLoading = $state(false);
let messageError = $state<string | null>(null);

const activeMessageTab = $derived(
	tabState.activeTab?.type === "message" ? tabState.activeTab : null,
);

const message = $derived<Message | undefined>(
	activeMessageTab
		? mail.peek(activeMessageTab.mailbox, activeMessageTab.uid) ?? loaded
		: undefined,
);

const srcdoc = $derived(message ? renderBody(message.html, message.text) : "");

$effect(() => {
	srcdoc;
	iframeHeight = 0;
});

$effect(() => {
	const tab = activeMessageTab;
	if (!tab) {
		loaded = undefined;
		messageLoading = false;
		messageError = null;
		return;
	}

	let cancelled = false;
	messageLoading = true;
	messageError = null;

	loader
		.track(mail.get(tab.mailbox, tab.uid))
		.then((result) => {
			if (cancelled) return;
			if (!result) {
				messageError = "Message not found";
				return;
			}
			loaded = result;
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

function renderBody(html?: string, text?: string) {
	return template.replace(
		"{{content}}",
		html
			? html
			: `<pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;padding:0;margin:0">${text ?? "(no text content)"}</pre>`,
	);
}

function handleMessageDelete(){
    const mailbox = message?.mailbox ?? "";
    const uid = message?.uid ?? -1;
    mail.delete(mailbox, uid);
    tabState.closeMessage(mailbox, uid)
}
</script>

{#snippet buttonSeparator()}
    <div class="border-r border-neutral-600 rounded-full h-[65%] mt-1.5 m-0.5"></div>
{/snippet}

<svelte:window
	onmessage={(e) => {
		if (!iframeEl || e.source !== iframeEl.contentWindow) return;

		if (e.data?.height) {
			iframeHeight = e.data.height;
		}
	}}
/>

{#if messageError}
	<div
		class="flex flex-col items-center justify-center h-32 text-neutral-500"
	>
		<i>{messageError}</i>
	</div>
{:else}
	{#if messageLoading}
		<div
			class="flex flex-col items-center justify-center h-32 text-neutral-500"
		>
			<i>Loading...</i>
		</div>
	{/if}

	{#if message}
		<article
			class="flex flex-col gap-4 p-6 w-full"
		>
            <header class="flex justify-between border-b border-neutral-800 pb-4 w-full">
                <div class="flex flex-col gap-1">
                    <h1 class="text-xl font-medium">
                        {message.subject}
                    </h1>

                    <div class="text-sm text-neutral-400">
                        <span>{message.sender}</span>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <div class="flex gap-px">
                        <Button.Root data-minimal title="Star">
                            <StarIcon />
                        </Button.Root>
                        {@render buttonSeparator()}
                        <Button.Root data-minimal title="Reply">
                            <ArrowBendUpLeftIcon />
                        </Button.Root>
                        <Button.Root data-minimal title="Reply All">
                            <ArrowBendDoubleUpLeftIcon />
                        </Button.Root>
                        <Button.Root data-minimal title="Forward">
                            <ArrowRightIcon />
                        </Button.Root>
                        {@render buttonSeparator()}
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                                <Button.Root data-minimal>
                                    <CaretDownIcon />
                                </Button.Root>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                                <DropdownMenu.Content class="mr-6 m-0 origin-top-right">
                                    <DropdownItem icon={message.read ? EnvelopeIcon : EnvelopeOpenIcon} title={message.read ? "Mark as unread" : "Mark as read"} />
                                    <DropdownMenu.Separator />
                                    <DropdownItem icon={PrinterIcon} title="Print" />
                                    <DropdownMenu.Sub>
                                        <DropdownItem subtrigger icon={FileIcon} title="Save as" />
                                        <DropdownMenu.Portal>
                                            <DropdownMenu.SubContent sideOffset={8}>
                                                <DropdownItem icon={GlobeIcon} title="HTML (.html)" />
                                                <DropdownItem icon={EnvelopeIcon} title="EML (.eml)" />
                                            </DropdownMenu.SubContent>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Sub>
                                    <DropdownMenu.Separator />
                                    <DropdownItem icon={TrashIcon} title="Delete" onclick={handleMessageDelete} />
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                    </div>
                    <time class="text-sm text-neutral-400">
                        {new Date(message.date).toLocaleString()}
                    </time>
                </div>
            </header>

			<iframe
                bind:this={iframeEl}
                sandbox="allow-scripts"
                title="Content"
                srcdoc={srcdoc}
                class="w-full border-none bg-transparent transition-opacity duration-100"
                style="
                    width: 100%;
                    height: {iframeHeight}px;
                    opacity: {iframeHeight > 0 ? 1 : 0};
                "
            ></iframe>
		</article>
	{/if}
{/if}
