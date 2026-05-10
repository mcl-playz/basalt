import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { mailRouter } from "./mail";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	mail: mailRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
