import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda"
import type { CreateAWSLambdaContextOptions } from "@trpc/server/adapters/aws-lambda"
import type { APIGatewayProxyEventV2 } from "aws-lambda"
import * as trpc from "@trpc/server"
import { appRouter } from "./appRouter"
import { getUser } from "./core"

// highTODO https://github.com/trpc/trpc/discussions/2371

// run with `npm run rebuild-offline`

function createContext({
  event,
  context,
}: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>): {
  user: string | undefined
} {
  const user = getUser(event.headers.authorization)
  return {
    user,
  }
}
type Context = trpc.inferAsyncReturnType<typeof createContext>

export const handler = awsLambdaRequestHandler({
  router: appRouter<Context>(),
  createContext,
})
