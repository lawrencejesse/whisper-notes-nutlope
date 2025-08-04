import { appRouter } from "@/trpc/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/trpc/init";
import type { NextRequest } from "next/server";

// Increase timeout for audio transcription (5 minutes)
export const maxDuration = 300;

const handler = (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
  });
};

export { handler as GET, handler as POST };
