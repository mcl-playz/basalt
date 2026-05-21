<script lang="ts">
import { DropdownMenu } from "bits-ui";
import type { Component } from "svelte";
import type { MouseEventHandler } from "svelte/elements";

let {
	icon: Icon,
	title,
	onclick,
}: {
	icon: Component;
	title: string;
	onclick?: MouseEventHandler<HTMLDivElement>;
} = $props();
</script>

<DropdownMenu.Item class="flex items-center gap-1.5" {onclick}>
    <Icon />
    {title}
</DropdownMenu.Item>