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

// Per-user pool of long-lived IMAP connections. ImapFlow serialises mailbox
// operations via getMailboxLock(), so multiple concurrent handlers can safely
// share the same client without opening a new TLS+LOGIN session each time.
const clientPool = new Map<string, Promise<ImapFlow>>();

async function createImapClient(userId: string): Promise<ImapFlow> {
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

/**
 * Return a connected, pooled IMAP client for the given user. The connection is
 * kept alive across requests; callers MUST NOT call `client.logout()` or
 * `client.close()` — just release any mailbox lock they took.
 */
export async function getImapClient(userId: string): Promise<ImapFlow> {
	const existing = clientPool.get(userId);
	if (existing) {
		try {
			const client = await existing;
			if (client.usable) return client;
		} catch {
			// fall through to recreate
		}
		clientPool.delete(userId);
	}

	const promise = createImapClient(userId);
	clientPool.set(userId, promise);

	try {
		const client = await promise;
		const evict = () => {
			if (clientPool.get(userId) === promise) {
				clientPool.delete(userId);
			}
		};
		client.once("close", evict);
		client.once("error", evict);
		return client;
	} catch (err) {
		clientPool.delete(userId);
		throw err;
	}
}
