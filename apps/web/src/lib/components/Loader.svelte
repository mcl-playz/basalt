<script lang="ts">
	import { loader } from "$lib/state/loader.svelte";

	function handleAnimationEnd() {
		if (loader.state === "success") loader.reset();
	}
</script>

{#if loader.state !== "idle"}
	<div class="fixed top-0 left-0 w-full h-0.5 z-9999 overflow-hidden">
		<div
			class="loading-bar"
			data-state={loader.state}
			onanimationend={handleAnimationEnd}
		></div>
	</div>
{/if}

<style>
	.loading-bar {
		height: 100%;
		width: 100%;
	}

	.loading-bar[data-state="loading"] {
		width: 35%;
		background: var(--color-orange-500);
		animation: loading-slide 1s ease-in-out infinite;
	}

	.loading-bar[data-state="error"] {
		background: var(--color-red-400);
        animation: var(--animate-pulse);
	}

	.loading-bar[data-state="success"] {
		background: var(--color-orange-500);
		animation: loading-fill 0.5s ease-in-out forwards;
	}

	@keyframes loading-slide {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(250%);
		}
	}

	@keyframes loading-fill {
		0% {
			transform: scaleX(0);
			transform-origin: left;
		}
		100% {
			transform: scaleX(1);
			transform-origin: left;
		}
	}
</style>
