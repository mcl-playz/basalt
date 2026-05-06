import { env } from "@basalt/env/server";
import { ImapFlow } from "imapflow";

import { decryptSecret } from "./crypto";

export const IMAP_PROVIDER_ID = "imap";

export function buildImapClient(email: string, password: string): ImapFlow {
	return new ImapFlow({
		host: env.IMAP_HOST,
		port: env.IMAP_PORT,
		// Implicit TLS only on port 993; otherwise use STARTTLS upgrade.
		secure: env.IMAP_PORT === 993,
		auth: { user: email, pass: password },
		tls: { rejectUnauthorized: false },
		logger: false,
	});
}

export async function verifyImapCredentials(email: string, password: string): Promise<boolean> {
	const client = buildImapClient(email, password);
	try {
		await client.connect();
		await client.logout();
		return true;
	} catch (err) {
		console.error("[auth] IMAP login failed:", err);
		try {
			client.close();
		} catch {}
		return false;
	}
}

/**
 * Open an authenticated IMAP connection for a given user, using the password
 * stored encrypted on the user's IMAP account row. The caller is responsible
 * for calling `client.logout()` (or `client.close()`) when done.
 */
export async function getImapClient(userId: string): Promise<ImapFlow> {
	const { auth } = await import("./index");
	const ctx = await auth.$context;

	const accounts = await ctx.internalAdapter.findAccounts(userId);
	const account = accounts.find((a) => a.providerId === IMAP_PROVIDER_ID);
	if (!account?.password) {
		throw new Error(`No IMAP credentials stored for user ${userId}`);
	}

	const user = await ctx.internalAdapter.findUserById(userId);
	if (!user) throw new Error(`User ${userId} not found`);

	const password = decryptSecret(account.password);
	const client = buildImapClient(user.email, password);
	await client.connect();
	return client;
}
