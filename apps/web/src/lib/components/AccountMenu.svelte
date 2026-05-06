<script lang="ts">
	import { goto } from "$app/navigation";
	import { authClient } from "$lib/auth-client";
	import { Avatar, DropdownMenu } from "bits-ui";
	import { GearSixIcon, SignInIcon, SignOutIcon, UserCircleIcon, UserIcon } from "phosphor-svelte";

    const session = authClient.useSession();

    async function handleSignIn(){
        goto("/login")
    }

    async function handleSignOut() {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					goto("/");
				}
			}
		});
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="cursor-pointer">
		{#if $session.data}
			<Avatar.Root
                delayMs={200}
                class="flex items-center justify-center"
            >
                <Avatar.Image src={$session.data?.user.image} alt={$session.data?.user.name} />
                <Avatar.Fallback>{$session.data?.user.name.charAt(0).toUpperCase()}</Avatar.Fallback>
            </Avatar.Root>
		{:else}
			<UserCircleIcon class="w-8 h-8 text-neutral-400" weight="light" />
		{/if}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content class="mr-2 origin-top">
			{#if $session.data}
				<DropdownMenu.Item>
					<div class="flex items-center">
						<UserIcon class="menu-icon" />
						Profile
					</div>
				</DropdownMenu.Item>
				<DropdownMenu.Item>
					<div class="flex items-center">
						<GearSixIcon class="menu-icon" />
						Settings
					</div>
				</DropdownMenu.Item>
				<DropdownMenu.Separator class="mx-1 my-1 h-px bg-neutral-800" />
				<DropdownMenu.Item onclick={handleSignOut}>
					<div class="flex items-center">
						<SignOutIcon class="menu-icon" />
						Sign Out
					</div>
				</DropdownMenu.Item>
			{:else}
				<DropdownMenu.Item onclick={handleSignIn}>
					<div class="flex items-center">
						<SignInIcon class="menu-icon" />
						Sign In
					</div>
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>