import { createDb } from "@basalt/db";
import * as schema from "@basalt/db/schema/auth";
import { env } from "@basalt/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { ImapFlow } from "imapflow";

// Sentinel value stored in `account.password` for accounts whose credentials live in an external system.
const EXTERNAL_AUTH_SENTINEL = "__external_auth__";

async function verifyImapCredentials(
	email: string,
	password: string,
): Promise<boolean> {
	const client = new ImapFlow({
		host: env.IMAP_HOST,
		port: env.IMAP_PORT,
		// Implicit TLS only on port 993; otherwise use STARTTLS upgrade.
		secure: env.IMAP_PORT === 993,
		auth: { user: email, pass: password },
		tls: { rejectUnauthorized: false },
		logger: false,
	});

	try {
		await client.connect();
		await client.logout();
		return true;
	} catch (_err) {
		try {
			client.close();
		} catch {}
		return false;
	}
}

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: schema,
		}),
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				if (ctx.path !== "/sign-in/email") return;

				const email = ctx.body?.email as string | undefined;
				const password = ctx.body?.password as string | undefined;

				if (!email || !password) {
					throw new APIError("BAD_REQUEST", {
						message: "Email and password are required",
					});
				}

				const ok = await verifyImapCredentials(email, password);
				if (!ok) {
					throw new APIError("UNAUTHORIZED", {
						message: "Invalid email or password",
					});
				}

				const existing =
					await ctx.context.internalAdapter.findUserByEmail(email, {
						includeAccounts: true,
					});

				if (!existing) {
					const created =
						await ctx.context.internalAdapter.createUser({
							email,
							name: email.split("@")[0] ?? email,
							emailVerified: true,
						});
					await ctx.context.internalAdapter.createAccount({
						userId: created.id,
						providerId: "credential",
						accountId: created.id,
						password: EXTERNAL_AUTH_SENTINEL,
						});
						} else if (
					!existing.accounts.some(
						(a) => a.providerId === "credential",
					)
				) {
					await ctx.context.internalAdapter.createAccount({
						userId: existing.user.id,
						providerId: "credential",
						accountId: existing.user.id,
						password: EXTERNAL_AUTH_SENTINEL,
					});
				}
			}),
		},
        emailAndPassword: {
			enabled: true,
			disableSignUp: true,
			password: {
				hash: async () => EXTERNAL_AUTH_SENTINEL,
				// Credentials are validated by the before-hook on /sign-in/email
				// against the external auth source. Only allow sign-in for accounts
				// provisioned through that path (i.e. carry the sentinel) so any
				// stray credential account with a real hash cannot bypass.
				verify: async ({ hash }) => hash === EXTERNAL_AUTH_SENTINEL,
			},
		},
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
		plugins: [],
	});
}

export const auth = createAuth();
