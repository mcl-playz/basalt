<script lang="ts">
import { QueryClientProvider } from "@tanstack/svelte-query";
import { SvelteQueryDevtools } from "@tanstack/svelte-query-devtools";
import { Toaster } from "svelte-sonner";
import { queryClient } from "$lib/orpc";
import "../app.css";
	import Loader from "$lib/components/Loader.svelte";

const { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
    <Loader />
	<div class="grid h-svh grid-rows-[auto_1fr]">
		<main class="overflow-y-auto">
			{@render children()}
		</main>
	</div>
	<Toaster richColors position="top-center" theme="system" offset="8px" />
	<SvelteQueryDevtools />
</QueryClientProvider>
