import { getImapClient } from "@basalt/auth";
import type { Mailbox, MailboxRole, Message } from "@basalt/types";
import { ORPCError } from "@orpc/client";
import type { FetchMessageObject } from "imapflow";
import { simpleParser } from "mailparser";
import z from "zod";
import { o, protectedProcedure } from "../index";

function collapseUidRange(uids: number[]): string {
	const sorted = [...new Set(uids)].sort((a, b) => a - b);
	if (sorted.length === 0) return "";
	const first = sorted[0];
	if (first === undefined) return "";
	let start: number = first;
	let end: number = first;
	const parts: string[] = [];
	for (let i = 1; i < sorted.length; i++) {
		const uid = sorted[i];
		if (uid === undefined) continue;
		if (uid === end + 1) {
			end = uid;
		} else {
			parts.push(start === end ? `${start}` : `${start}:${end}`);
			start = uid;
			end = uid;
		}
	}
	parts.push(start === end ? `${start}` : `${start}:${end}`);
	return parts.join(",");
}

export const mailRouter = o.prefix("/mail").router({
	getMailboxes: protectedProcedure
		.route({ method: "GET", path: "/mailboxes" })
		.handler(async ({ context }) => {
			const client = await getImapClient(context.session.user.id);

            const ROLE_MAP: Record<string, MailboxRole> = {
                "\\Inbox": "inbox",
                "\\Sent": "sent",
                "\\Drafts": "drafts",
                "\\Trash": "trash",
                "\\Junk": "spam",
                "\\Archive": "archive"
            };

			const mailboxes = (await client.list()).map<Mailbox>((m) => {
				let name = m.name;
                const role = ROLE_MAP[m.specialUse ?? ""] ?? null;
				switch (role) {
					case "inbox":
						name = "Inbox";
						break;

					case "spam":
						name = "Spam";
						break;
				}

				return {
					...m,
					name,
                    role
				};
			});

			mailboxes;

			return {
				mailboxes: mailboxes.map<Mailbox>((m) => ({
					path: m.path,
					name: m.name,
					delimiter: m.delimiter,
                    role: m.role
				})),
			};
		}),
	getMessages: protectedProcedure
		.route({ method: "GET", path: "/messages" })
		.input(
			z.object({
				mailboxPath: z.string().default("inbox"),
				bodies: z.coerce.boolean().default(false),
				uids: z.array(z.coerce.number().int().positive()).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const client = await getImapClient(context.session.user.id);
			const lock = await client.getMailboxLock(input.mailboxPath);

			try {
				const mailbox = await client.mailboxOpen(input.mailboxPath);

				if (mailbox.exists === 0) {
					return { messages: [] };
				}

				if (input.uids && input.uids.length === 0) {
					return { messages: [] };
				}

				const range = input.uids ? collapseUidRange(input.uids) : "1:*";

				const fetched: FetchMessageObject[] = [];
				for await (const msg of client.fetch(
					range,
					{
						envelope: true,
						flags: true,
						...(input.bodies ? { source: true } : null),
					},
					input.uids ? { uid: true } : undefined,
				)) {
					fetched.push(msg);
				}

				const messages: Message[] = await Promise.all(
					fetched.map(async (msg) => {
						const raw = input.bodies ? msg.source : null;
						const parsed = raw
							? await simpleParser(Buffer.from(raw))
							: null;

						return {
							mailbox: mailbox.path,
							uid: msg.uid,
							subject: msg.envelope?.subject ?? "(No Subject)",
							sender:
								msg.envelope?.from?.[0]?.address ??
								"unknown-sender",
							date: msg.envelope?.date ?? new Date(),
							read: msg.flags?.has("\\Seen") ?? false,
							starred: msg.flags?.has("\\Flagged") ?? false,
							text: parsed?.text ?? "",
							html: parsed?.html || "",
						};
					}),
				);

				return { messages: messages.reverse() };
			} catch (error) {
				if (!(error instanceof Error)) {
					console.error(error);
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: "Unknown error",
					});
				}

				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: error.message,
					cause: error,
				});
			} finally {
				lock.release();
			}
		}),
	getMessage: protectedProcedure
		.route({ method: "GET", path: "/messages/{mailbox}/{uid}" })
		.input(
			z.object({
				mailbox: z.string(),
				uid: z.coerce.number(),
			}),
		)
		.handler(async ({ context, input }) => {
			const client = await getImapClient(context.session.user.id);
			const lock = await client.getMailboxLock(input.mailbox);

			try {
				const mailbox = await client.mailboxOpen(input.mailbox);

				if (mailbox.exists === 0) {
					return { message: null };
				}

				const message = await client.fetchOne(
					`${input.uid}`,
					{ envelope: true, flags: true, bodyParts: ["1"] },
					{ uid: true },
				);

				if (!message) {
					return { message: null };
				}

				const raw = message?.bodyParts?.get("1") ?? Buffer.alloc(0);
				const parsed = await simpleParser(raw);

				return {
					message: {
						mailbox: input.mailbox,
						uid: message?.uid,
						subject: message?.envelope?.subject ?? "(No Subject)",
						sender:
							message?.envelope?.from?.[0]?.address ??
							"unknown-sender",
						date: message?.envelope?.date ?? new Date(),
						read: message?.flags?.has("\\Seen") ?? false,
						text: parsed.text ?? "",
						html: parsed.html || "",
					},
				};
			} catch (error) {
				if (!(error instanceof Error)) {
					console.error(error);
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: "Unknown error",
					});
				}

				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: error.message,
					cause: error,
				});
			} finally {
				lock.release();
			}
		}),
	deleteMessage: protectedProcedure
		.route({ method: "DELETE", path: "/messages/{mailbox}/{uid}" })
		.input(
			z.object({
				mailbox: z.string(),
				uid: z.coerce.number(),
				permanent: z.coerce.boolean().optional().default(false),
			}),
		)
		.handler(async ({ context, input }) => {
			const client = await getImapClient(context.session.user.id);
			const lock = await client.getMailboxLock(input.mailbox);

			try {
				const mailbox = await client.mailboxOpen(input.mailbox);

				if (input.permanent || ["\\Drafts", "\\Trash", "\\Junk"].includes(mailbox.specialUse || "")) {
					await client.messageDelete(input.uid, {
						uid: true,
					});
				} else {
                    const mailboxList = await client.list();
                    const trashPath = mailboxList.find(mb => mb.specialUse === "\\Trash")?.path ?? "Trash";

					await client.messageMove(input.uid, trashPath, {
						uid: true,
					});
				}

				return {
					success: true,
				};
			} catch (error) {
				if (!(error instanceof Error)) {
					console.error(error);
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: "Unknown error",
					});
				}

				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: error.message,
					cause: error,
				});
			} finally {
				lock.release();
			}
		}),
    setFlags: protectedProcedure
        .route({ method: "PATCH", path: "/messages/{mailbox}/{uid}/flags" })
        .input(
            z.object({
                mailbox: z.string(),
                uid: z.coerce.number(),
                add: z.array(z.string()).optional().default([]),
                remove: z.array(z.string()).optional().default([]),
            }),
        )
        .handler(async ({ context, input }) => {
            const client = await getImapClient(context.session.user.id);
            const lock = await client.getMailboxLock(input.mailbox);

            try {
                await client.mailboxOpen(input.mailbox);

                if (input.add.length > 0) {
                    await client.messageFlagsAdd(input.uid, input.add, { uid: true });
                }
                if (input.remove.length > 0) {
                    await client.messageFlagsRemove(input.uid, input.remove, { uid: true });
                }

                return { success: true };
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Unknown error" });
                }
                throw new ORPCError("INTERNAL_SERVER_ERROR", {
                    message: error.message,
                    cause: error,
                });
            } finally {
                lock.release();
            }
        }),
});
