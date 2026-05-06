<script lang="ts">
import { authClient } from "$lib/auth-client";
	import { store } from "$lib/message/store";

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

    await authClient.signIn.credentials({ email, password, fetchOptions: {
        onSuccess: async () => {
            await store.requestPersistentStorage().then();
            window.location.assign("/");
        },
        onError: (e) => {
            errorMessage = "Invalid email or password. Please try again.";
        }
    }});
    loading = false;
}
</script>

<div class="min-h-screen flex items-center justify-center px-4">
	<div class="max-w-md w-full space-y-8 bg-neutral-900 p-8 rounded-xl shadow-lg">
		<div>
			<h2 class="text-center text-3xl font-extrabold text-white">Welcome Back</h2>
			<p class="mt-2 text-center text-sm text-neutral-400">
				Please sign in to your account
			</p>
		</div>

		<form class="mt-8 space-y-6" onsubmit={handleLogin}>
			<div class="space-y-4">
				<!-- Email Input -->
				<div>
					<label for="email" class="block text-sm font-medium text-neutral-400">Email Address</label>
					<input
						bind:value={email}
						id="email"
						type="email"
						required
						class="mt-1 block w-full px-3 py-2 border {email && !isEmailValid ? 'border-red-300' : 'border-neutral-700'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						placeholder="you@example.com"
					/>
				</div>

				<!-- Password Input -->
				<div>
					<label for="password" class="block text-sm font-medium text-neutral-400">Password</label>
					<div class="relative mt-1">
						<input
							bind:value={password}
							id="password"
							type={showPassword ? "text" : "password"}
							required
							class="block w-full px-3 py-2 border border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
							placeholder={showPassword ? 'Password' : '••••••••'}
						/>
						<button 
							type="button"
							onclick={() => showPassword = !showPassword}
							class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
						>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</div>
				</div>
			</div>

			{#if errorMessage}
				<p class="text-red-500 text-sm text-center font-medium">{errorMessage}</p>
			{/if}

			<div>
				<button
					disabled={!canSubmit}
					type="submit"
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
				>
					{#if loading}
						<span class="animate-pulse">Authenticating...</span>
					{:else}
						Sign in
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>