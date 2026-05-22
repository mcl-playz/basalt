<script lang="ts">
import DropdownItem from "@basalt/ui-kit/components/DropdownItem";
import { Avatar, DropdownMenu } from "bits-ui";
import {
	GearSixIcon,
	SignInIcon,
	SignOutIcon,
	UserCircleIcon,
	UserIcon,
} from "phosphor-svelte";
import { goto } from "$app/navigation";
import { authClient } from "$lib/auth";

const session = authClient.useSession();

async function handleSignIn() {
	goto("/login");
}

async function handleSignOut() {
	await authClient.signOut({
		fetchOptions: {
			onSuccess: () => {
				goto("/");
			},
		},
	});
}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="cursor-pointer flex gap-2">
		{#if $session.data}
			<Avatar.Root
                delayMs={200}
                class="flex items-center justify-center"
            >
                <Avatar.Image src={$session.data.user.image} alt={$session.data.user.name} />
                <Avatar.Fallback>{$session.data.user.name.charAt(0).toUpperCase()}</Avatar.Fallback>
            </Avatar.Root>
            <p class="text-neutral-400 text-sm font-light">{$session.data.user.email}</p>
		{:else}
			<UserCircleIcon class="w-8 h-8 text-neutral-400" weight="light" />
		{/if}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content class="m-2 origin-bottom-left">
			{#if $session.data}
				<DropdownItem icon={UserIcon} title="Profile" />
				<DropdownItem icon={GearSixIcon} title="Settings" />
				<DropdownMenu.Separator />
				<DropdownItem icon={SignOutIcon} title="Sign Out" onclick={handleSignOut} />
			{:else}
				<DropdownItem icon={SignInIcon} title="Sign In" onclick={handleSignIn} />
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>