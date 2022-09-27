/* eslint-disable @typescript-eslint/naming-convention */
import * as trpc from "@trpc/server"
import { z } from "zod"
import AWS, { Credentials, DynamoDB } from "aws-sdk"

const IVY_TABLE = process.env.IVY_TABLE as string
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
}
const invokedAppRouter = appRouter()
export type AppRouter = typeof invokedAppRouter
