import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";

import { env } from "@basalt/env/server";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
	// Derive a 32-byte key from BETTER_AUTH_SECRET so we don't need a separate env var.
	return createHash("sha256").update(env.BETTER_AUTH_SECRET).digest();
}

/**
 * Encrypt a UTF-8 string with AES-256-GCM. Returns a base64 blob containing
 * iv (12B) || tag (16B) || ciphertext.
 */
export function encryptSecret(plaintext: string): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, getKey(), iv);
	const ciphertext = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptSecret(blob: string): string {
	const buf = Buffer.from(blob, "base64");
	const iv = buf.subarray(0, IV_LENGTH);
	const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
	const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
	const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([
		decipher.update(ciphertext),
		decipher.final(),
	]).toString("utf8");
}
