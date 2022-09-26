import * as trpc from "@trpc/server"
import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda"
import type { CreateAWSLambdaContextOptions } from "@trpc/server/adapters/aws-lambda"
import type { APIGatewayProxyEventV2 } from "aws-lambda"
import { z } from "zod"

function createContext({
  event,
  context,
}: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>): {
  event: APIGatewayProxyEventV2
  user: string | undefined
} {
  return {
    event,
    user: event.headers["x-user"],
  }
}
type Context = trpc.inferAsyncReturnType<typeof createContext>

const appRouter = trpc.router<Context>().query("greet", {
  input: z.object({
    name: z.string(),
  }),
  resolve(req) {
    return `Greetings, ${req.input.name}. x-user?: ${
      req.ctx.user ?? "undefined"
    }. `
  },
})
export type AppRouter = typeof appRouter

export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext,
})
