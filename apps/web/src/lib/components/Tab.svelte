<script lang="ts">
import { Button } from "bits-ui";
import { XIcon } from "phosphor-svelte";
import type { Component } from "svelte";

let {
	icon: Icon,
	title,
	selected = false,
	closeBtn = true,
	shrink = true,
	open,
	close,
}: {
	icon: Component;
	title: string;
	selected: boolean;
	closeBtn?: boolean;
	shrink?: boolean;
	open?: (e: MouseEvent) => void;
	close?: (e: MouseEvent) => void;
} = $props();

function trigger(e: MouseEvent, func?: (e: MouseEvent) => void) {
	e.stopPropagation();
	func?.(e);
}
</script>

<Button.Root 
    class="group flex items-center justify-between py-1 px-1.5 text-sm h-7 border-none overflow-hidden relative before:absolute before:inset-0 before:bg-neutral-900 before:-z-10
    {selected ? "w-48 shrink-0 bg-neutral-800/75" : "hover:bg-neutral-800/40"} {!shrink ? 'w-48 shrink-0' : 'basis-48 min-w-8 shrink'}"
    onclick={(e: MouseEvent) => trigger(e, open)}
>
    <span class="flex items-center gap-1 min-w-0 flex-1 overflow-hidden mask-r-from-[calc(100%-1.25rem)] mask-r-to-100%">
        <Icon class="shrink-0" />
        <span class="whitespace-nowrap">{title}</span>
    </span>
    <button class="{closeBtn ? "block shrink-0" : "hidden"} p-1 cursor-pointer" onclick={(e: MouseEvent) => trigger(e, close)}>
        <XIcon class="size-3 text-neutral-500 hover:text-white hidden group-hover:block transition-colors" weight="bold" />
    </button>
</Button.Root>
