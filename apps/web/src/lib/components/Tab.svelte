<script lang="ts">
	import { Button } from "bits-ui";
	import { XIcon } from "phosphor-svelte";
	import type { Component } from "svelte";

	let {
        icon: Icon,
        title,
        selected = false,
        closeBtn = true,
        open,
        close,
    }: {
        icon: Component;
        title: string;
        selected: boolean,
        closeBtn?: boolean;
        open?: (e: MouseEvent) => void;
        close?: (e: MouseEvent) => void;
    } = $props();

    function trigger(e: MouseEvent, func?: Function){
        e.stopPropagation();
        func?.(e)
    }
</script>

<Button.Root 
    class="group flex items-center justify-between py-1 px-1.5 text-sm w-48 h-7 bg-neutral-900 border-none overflow-hidden
    {selected ? 'bg-neutral-800/75!' : 'hover:bg-neutral-800/40'}"
    onclick={(e: MouseEvent) => trigger(e, open)}
>
    <span class="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
        <Icon class="shrink-0" />
        <span class="truncate">{title}</span>
    </span>
    <button class="{closeBtn ? "block shrink-0" : "hidden"} p-1 cursor-pointer" onclick={(e: MouseEvent) => trigger(e, close)}>
        <XIcon class="size-3 text-neutral-500 hover:text-white hidden group-hover:block" weight="bold" />
    </button>
</Button.Root>
