import { credentialsClient } from "better-auth-credentials-plugin/client";
import { createAuthClient } from "better-auth/svelte";
import { PUBLIC_SERVER_URL } from "$env/static/public";

export const authClient = createAuthClient({
	baseURL: PUBLIC_SERVER_URL,
	plugins: [credentialsClient()],
});
