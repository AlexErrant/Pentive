import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda"
import type { CreateAWSLambdaContextOptions } from "@trpc/server/adapters/aws-lambda"
import type { APIGatewayProxyEventV2 } from "aws-lambda"
import * as trpc from "@trpc/server"
import { appRouter } from "./appRouter"

function createContext({
  event,
  context,
}: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>): {
  user: string | undefined
} {
  return {
    user: event.headers["x-user"],
  }
}
type Context = trpc.inferAsyncReturnType<typeof createContext>

export const handler = awsLambdaRequestHandler({
  router: appRouter<Context>(),
  createContext,
})
