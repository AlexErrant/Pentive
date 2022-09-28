/* eslint-disable @typescript-eslint/naming-convention */
import config from "./config"
import * as trpc from "@trpc/server"
import { z } from "zod"
import AWS, { Credentials, DynamoDB } from "aws-sdk"

const dynamoDbClientParams: DynamoDB.Types.ClientConfiguration = {}
if (config.IS_OFFLINE === "true") {
  dynamoDbClientParams.region = "localhost"
  dynamoDbClientParams.endpoint = "http://localhost:8000"
  dynamoDbClientParams.credentials = new Credentials(
    "DEFAULT_ACCESS_KEY",
    "DEFAULT_SECRET"
  )
}
const dynamoDbClient = new AWS.DynamoDB.DocumentClient(dynamoDbClientParams)

interface Context {
  user: string | undefined
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function appRouter<TContext extends Context>() {
  return trpc
    .router<TContext>()
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
            TableName: config.IVY_TABLE,
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
            TableName: config.IVY_TABLE,
            Key: {
              PK: req.input,
              SK: req.input,
            },
          })
          .promise()
        return r.Item
      },
    })
}
const invokedAppRouter = appRouter()
export type AppRouter = typeof invokedAppRouter
