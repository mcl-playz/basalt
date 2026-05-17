<script lang="ts">
	import type { Message } from "@basalt/types";
	import template from "$lib/mail/iframe.html?raw";

	let { message }: { message: Message } = $props();

	let iframeEl: HTMLIFrameElement | undefined = $state();
	let iframeHeight = $state(0);

	$effect(() => {
		message.mailbox;
		message.uid;
		iframeHeight = 0;
	});

	const renderIFrameContent = (
		html: string | undefined,
		text: string | undefined,
	) =>
		template.replace(
			"{{content}}",
			html
				? html
				: `<pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px">${text ?? "(no text content)"}</pre>`,
		);
</script>

<svelte:window
	onmessage={(e) => {
		if (!iframeEl || e.source !== iframeEl.contentWindow) return;

		if (e.data?.height) {
			iframeHeight = e.data.height;
		}
	}}
/>

<article class="flex flex-col gap-4 p-6 w-full">
	<header class="flex flex-col gap-1 border-b border-neutral-800 pb-4">
		<h1 class="text-xl font-medium">
			{message.subject}
		</h1>

		<div class="text-sm text-neutral-400 flex justify-between">
			<span>{message.sender}</span>

			<time>
				{new Date(message.date).toLocaleString()}
			</time>
		</div>
	</header>

	<iframe
		bind:this={iframeEl}
		sandbox="allow-scripts"
		title="Content"
		srcdoc={renderIFrameContent(message.html, message.text)}
		class="w-full border-none bg-transparent"
		style="
			width: 100%;
			height: {iframeHeight}px;
		"
	></iframe>
</article>