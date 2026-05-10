<script lang="ts">
    import type { Message } from "@basalt/types";
    import template from "$lib/iframe.html?raw";

    let { message }: { message: Message } = $props();

    let iframeEl: HTMLIFrameElement | undefined = $state();
    let iframeDimensions = $state({ width: 0, height: 0 });

    // Reset dimensions whenever the rendered message changes so a previously
    // larger email's size doesn't linger before the new iframe reports back.
    $effect(() => {
        message.mailbox;
        message.uid;
        iframeDimensions = { width: 0, height: 0 };
    });

    const renderIFrameContent = (
        html: string | undefined,
        text: string | undefined
    ) =>
        template.replace(
            "{{content}}",
            html
                ? html
                : `<pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px">${text ?? "(no text content)"}</pre>`
        );
</script>

<svelte:window
    onmessage={(e) => {
        // only accept dimension updates from THIS iframe
        if (!iframeEl || e.source !== iframeEl.contentWindow) return;

        if (e.data?.width) {
            iframeDimensions.width = e.data.width;
        }

        if (e.data?.height) {
            iframeDimensions.height = e.data.height;
        }
    }}
/>

<article class="flex flex-col gap-4 p-6">
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
        class="border-none bg-transparent"
        style="
            width: min(100%, {iframeDimensions.width}px);
            height: {iframeDimensions.height}px;
        "
    ></iframe>
</article>
