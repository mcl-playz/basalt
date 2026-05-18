<script lang="ts">
	import { store } from "$lib/mail/store";
	import { loader } from "$lib/state/loader.svelte";
	import { getTabState } from "$lib/state/tabs.svelte";
	import type { Message } from "@basalt/types";
	import template from "$lib/mail/iframe.html?raw";

	const tabState = getTabState();

	let iframeEl: HTMLIFrameElement | undefined = $state();
	let iframeHeight = $state(0);
	let activeMessage = $state<Message>();
	let messageLoading = $state(false);
	let messageError = $state<string | null>(null);

    $effect(() => {
        activeMessage;
		iframeHeight = 0;
	});

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

		loader
			.track(store.getMessage(tab.mailbox, tab.uid))
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

	function renderIFrameContent(html?: string, text?: string){
		return template.replace(
			"{{content}}",
			html
				? html
				: `<pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;padding:0;margin:0">${text ?? "(no text content)"}</pre>`,
		);
    }
</script>

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

	{#if activeMessage}
		<article
			class="flex flex-col gap-4 p-6 w-full"
		>
			<header class="flex flex-col gap-1 border-b border-neutral-800 pb-4">
				<h1 class="text-xl font-medium">
					{activeMessage.subject}
				</h1>

				<div class="text-sm text-neutral-400 flex justify-between">
					<span>{activeMessage.sender}</span>

					<time>
						{new Date(activeMessage.date).toLocaleString()}
					</time>
				</div>
			</header>

			<iframe
                bind:this={iframeEl}
                sandbox="allow-scripts"
                title="Content"
                srcdoc={renderIFrameContent(activeMessage.html, activeMessage.text)}
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
