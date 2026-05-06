<script lang="ts">
import { QueryClientProvider } from "@tanstack/svelte-query";
import { SvelteQueryDevtools } from "@tanstack/svelte-query-devtools";
import { queryClient } from "$lib/orpc";
import "../app.css";

const { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
	<div class="grid h-svh grid-rows-[auto_1fr]">
		<main class="overflow-y-auto">
			{@render children()}
		</main>
	</div>
	<!-- <Toaster richColors position="top-right" theme="system" /> -->
	<SvelteQueryDevtools />
</QueryClientProvider>
