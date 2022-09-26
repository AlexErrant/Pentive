/* eslint-disable @typescript-eslint/naming-convention */
import * as trpc from "@trpc/server"
import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda"
import type { CreateAWSLambdaContextOptions } from "@trpc/server/adapters/aws-lambda"
import type { APIGatewayProxyEventV2 } from "aws-lambda"
import { z } from "zod"
import AWS, { Credentials, DynamoDB } from "aws-sdk"

const IVY_TABLE = process.env.IVY_TABLE
if (IVY_TABLE === undefined) throw new Error("`IVY_TABLE` should be defined")
const dynamoDbClientParams: DynamoDB.Types.ClientConfiguration = {}
if (process.env.IS_OFFLINE === "true") {
  dynamoDbClientParams.region = "localhost"
  dynamoDbClientParams.endpoint = "http://localhost:8000"
  dynamoDbClientParams.credentials = new Credentials(
    "DEFAULT_ACCESS_KEY",
    "DEFAULT_SECRET"
  )
}
const dynamoDbClient = new AWS.DynamoDB.DocumentClient(dynamoDbClientParams)

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

const appRouter = trpc
  .router<Context>()
  .query("greet", {
    input: z.object({
      name: z.string(),
    }),
    resolve(req) {
      return `Greetings, ${req.input.name}. x-user?: ${
        req.ctx.user ?? "undefined"
      }. `
    },
  })
  .mutation("addTemplate", {
    input: z.object({
      id: z.string(),
      name: z.string(),
    }),
    async resolve(req) {
      await dynamoDbClient
        .put({
          TableName: IVY_TABLE,
          Item: {
            PK: req.input.id,
            SK: req.input.id,
            name: req.input.name,
          },
        })
        .promise()
    },
  })
  .query("getTemplate", {
    input: z.string(),
    async resolve(req) {
      const r = await dynamoDbClient
        .get({
          TableName: IVY_TABLE,
          Key: {
            PK: req.input,
            SK: req.input,
          },
        })
        .promise()
      return r.Item
    },
  })
export type AppRouter = typeof appRouter

export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext,
})
