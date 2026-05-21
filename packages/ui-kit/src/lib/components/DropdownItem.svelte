<script lang="ts">
import { DropdownMenu } from "bits-ui";
import type { Component, } from "svelte";
import type { MouseEventHandler } from "svelte/elements";
import { CaretRightIcon } from "phosphor-svelte";

let {
	icon: Icon,
	title,
    subtrigger = false,
	onclick,
}: {
	icon: Component;
	title: string;
    subtrigger?: boolean;
	onclick?: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
} = $props();

// svelte-ignore state_referenced_locally
const Element = subtrigger ? DropdownMenu.SubTrigger : DropdownMenu.Item;
</script>

<Element class="flex w-full items-center gap-1.5" {onclick}>
    <Icon />
    <span>{title}</span>

    {#if subtrigger}
        <CaretRightIcon class="ml-auto size-3" />
    {/if}
</Element>