<script lang="ts">
import { Button, Label } from "bits-ui";
import { EyeClosedIcon, EyeIcon, EyeSlashIcon } from "phosphor-svelte";
import { authClient } from "$lib/auth";
import { store } from "$lib/mail/store";
	import { cache } from "$lib/mail/cache";
	import { search } from "$lib/mail/search";

let email = $state("");
let password = $state("");
let showPassword = $state(false);
let loading = $state(false);
let errorMessage = $state("");

let isEmailValid = $derived(email.includes("@") && email.includes("."));
let canSubmit = $derived(isEmailValid && password.length >= 8 && !loading);

async function handleLogin(e: Event) {
	e.preventDefault();
	loading = true;
	errorMessage = "";

	await authClient.signIn.credentials({
		email,
		password,
		fetchOptions: {
			onSuccess: async () => {
                cache.clear();
                search.clear();
				await store.requestPersistentStorage().then();
				window.location.assign("/");
			},
			onError: () => {
				errorMessage = "Invalid email or password. Please try again.";
			},
		},
	});
	loading = false;
}
</script>

<div class="min-h-screen flex items-center justify-center px-4">
	<div class="max-w-xs w-full">
        <div class="flex items-center justify-center gap-2">
            <div class="w-6 h-6 bg-indigo-600 rounded shadow-lg shadow-indigo-500/20"></div>
            <h2 class="text-center text-3xl font-extrabold text-white">Basalt</h2>
        </div>
		

		<form class="mt-3 space-y-6" onsubmit={handleLogin}>
			<div class="space-y-2">
				<!-- Email Input -->
				<div>
                    <Label.Root
                        for="email"
                        class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-neutral-400"
                    >
                        Email Address
                    </Label.Root>
					<input
						bind:value={email}
						id="email"
						type="email"
						class="block w-full {email && !isEmailValid ? 'border-red-300' : ""}"
						placeholder="john.smith@example.com"
						required
					/>
				</div>

				<!-- Password Input -->
				<div>
					<Label.Root
                        for="password"
                        class="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-neutral-400"
                    >
                        Password
                    </Label.Root>
					<div class="relative">
						<input
							bind:value={password}
							id="password"
							type={showPassword ? "text" : "password"}
							class="block w-full"
							placeholder={showPassword ? 'Password' : '••••••••'}
							required
						/>
						<button
                            type="button"
							onclick={() => showPassword = !showPassword}
							class="absolute inset-y-0 right-0 p-3 flex items-center cursor-pointer text-neutral-400 hover:text-white transition-colors"
                            data-minimal
                        >
                            {#if showPassword}
                                <EyeSlashIcon class="size-5" />
                            {:else}
                                <EyeIcon class="size-5" />
                            {/if}
                        </button>
					</div>
				</div>
			</div>

			{#if errorMessage}
				<p class="text-red-500 text-sm text-center font-medium">{errorMessage}</p>
			{/if}

			<div>
				<Button.Root
					disabled={!canSubmit}
					type="submit"
                    class="group relative w-full px-1 py-2.5"
					data-primary
				>
					{#if loading}
						<span class="animate-pulse">Authenticating...</span>
					{:else}
						Sign in
					{/if}
                </Button.Root>
			</div>
		</form>
	</div>
</div>