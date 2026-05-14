import { getImapClient } from "@basalt/auth";
import type { Mailbox, Message } from "@basalt/types";
import type { FetchMessageObject } from "imapflow";
import { simpleParser } from "mailparser";
import z from "zod";
import { o, protectedProcedure } from "../index";
import { ORPCError } from "@orpc/client";

export const mailRouter = o.prefix("/mail").router({
	getMailboxes: protectedProcedure
		.route({ method: "GET", path: "/mailboxes" })
		.handler(async ({ context }) => {
			const client = await getImapClient(context.session.user.id);
			const mailboxes = (await client.list()).map<Mailbox>((m) => {
                let name = m.name;
                switch (name.toLowerCase()) {
                    case "inbox":
                        name = "Inbox";
                        break;

                    case "junk":
                        name = "Spam";
                        break;
                }

                return {
                    ...m,
                    name,
                };
            });

            mailboxes

			return {
				mailboxes: mailboxes.map<Mailbox>((m) => ({
					path: m.path,
					name: m.name,
					delimiter: m.delimiter,
				})),
			};
		}),
	getMessages: protectedProcedure
		.route({ method: "GET", path: "/messages" })
		.input(
			z.object({
				mailboxPath: z.string().default("inbox"),
				bodies: z.coerce.boolean().default(false),
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

				const fetched: FetchMessageObject[] = [];
				for await (const msg of client.fetch("1:*", {
					envelope: true,
					flags: true,
					...(input.bodies ? { source: true } : null),
				})) {
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
        .route({ method: "DELETE", path: "/messages/{mailbox}/{uid}"})
        .input(z.object({
            mailbox: z.string(),
            uid: z.coerce.number(),
        }))
        .handler(async ({ context, input }) => {
            const client = await getImapClient(context.session.user.id);
            const lock = await client.getMailboxLock(input.mailbox);

			try {
				await client.mailboxOpen(input.mailbox);

                await client.messageDelete(input.uid, {
                    uid: true,
                });

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
});
