import { createDb } from "@basalt/db";
import * as schema from "@basalt/db/schema/auth";
import { env } from "@basalt/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { credentials } from "better-auth-credentials-plugin";

import { encryptSecret } from "./crypto";
import { IMAP_PROVIDER_ID, verifyImapCredentials } from "./imap";

export { getImapClient, IMAP_PROVIDER_ID } from "./imap";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: schema,
		}),
		emailAndPassword: { enabled: false },
		trustedOrigins: [env.CORS_ORIGIN],
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [
			credentials({
				autoSignUp: true,
				linkAccountIfExisting: true,
				providerId: IMAP_PROVIDER_ID,
				async callback(ctx, parsed) {
					const ok = await verifyImapCredentials(parsed.email, parsed.password);
					if (!ok) return null;

					const encrypted = encryptSecret(parsed.password);

					return {
						email: parsed.email,
						name: parsed.email.split("@")[0] ?? parsed.email,
						emailVerified: true,
						async onSignIn(userData, _user, account) {
							if (account) {
								await ctx.context.internalAdapter.updateAccount(account.id, {
									password: encrypted,
								});
							}
							return userData;
						},
						async onLinkAccount() {
							return { password: encrypted };
						},
					};
				},
			}),
		],
	});
}

export const auth = createAuth();
