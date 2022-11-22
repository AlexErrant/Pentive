/* eslint-disable @typescript-eslint/naming-convention */
import config from "./config"
import * as trpc from "@trpc/server"
import { z } from "zod"
import AWS, { AWSError, Credentials, DynamoDB } from "aws-sdk"
import { Table, Entity } from "dynamodb-toolbox"
import { DocumentClient } from "aws-sdk/clients/dynamodb"
import { PromiseResult } from "aws-sdk/lib/request"
import { createRemoteTemplate, remoteTemplate } from "./schemas/template"
import { id } from "./schemas/core"
import superjson from "superjson"
import { throwExp } from "./core"
import { ulid } from "ulid"
import _ from "lodash"
import { Ulid } from "id128"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const dynamoDbClientParams: DocumentClient.DocumentClientOptions &
  DynamoDB.Types.ClientConfiguration = {
  convertEmptyValues: false, // https://stackoverflow.com/q/37479586
}

if (config.IS_OFFLINE === "true") {
  dynamoDbClientParams.region = "localhost"
  dynamoDbClientParams.endpoint = "http://localhost:8000"
  dynamoDbClientParams.credentials = new Credentials(
    "DEFAULT_ACCESS_KEY",
    "DEFAULT_SECRET"
  )
}
const dynamoDbClient = new AWS.DynamoDB.DocumentClient(dynamoDbClientParams)

const ivy = new Table({
  name: config.IVY_TABLE,
  partitionKey: "PK",
  sortKey: "SK",
  DocumentClient: dynamoDbClient,
})

const template = new Entity({
  name: "t",
  attributes: {
    id: { type: "string", partitionKey: true },
    sk: { type: "string", sortKey: true, hidden: true },
    nook: { type: "string", required: true },
    author: { type: "string", required: true },
    name: { type: "string", required: true },
    templateType: { type: "string", required: true },
    fields: { type: "list", required: true },
    css: { type: "string", required: true },
    childTemplates: { type: "string", required: true },
    ankiId: { type: "number" },
  },
  table: ivy,
} as const)

interface Context {
  user: string | undefined
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function appRouter<TContext extends Context>() {
  return trpc
    .router<TContext>()
    .transformer(superjson)
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
        name: z.string(),
      }),
      async resolve(req) {
        const id = Ulid.generate()
        await prisma.template.create({
          data: {
            ...req.input,
            id: Buffer.from(id.toRaw(), "hex"),
            nook: "nook",
            authorId: req.ctx.user ?? throwExp("user not found"), // highTODO put this route behind protected middleware upon TRPCv10
            type: "type",
            fields: "fields",
            css: "css",
            childTemplates: "childTemplates",
            ankiId: 0,
          },
        })
        return id.toCanonical()
      },
    })
    .mutation("addTemplates", {
      input: z.array(createRemoteTemplate),
      async resolve(req) {
        // highTODO batch in chunks of 25
        const templatePutsAndIds = req.input.map((t) => {
          const remoteId = ulid()
          return [
            template.putBatch({
              sk: "a",
              author: req.ctx.user ?? throwExp("user not found"), // highTODO put this route behind protected middleware upon TRPCv10
              ...t,
            }),
            [t.id, remoteId] as [string, string],
          ] as const
        })
        const templatePuts = templatePutsAndIds.map((x) => x[0])
        const remoteIdByLocal = _.fromPairs(templatePutsAndIds.map((x) => x[1]))
        // highTODO run to completion (pull on `next`), handle errors, add exponential back off https://github.com/jeremydaly/dynamodb-toolbox/issues/152 https://stackoverflow.com/q/42911223
        const result = await (ivy.batchWrite(templatePuts) as Promise<
          | DocumentClient.BatchWriteItemInput
          | (PromiseResult<DocumentClient.BatchWriteItemOutput, AWSError> & {
              next?: () => boolean
            })
        >)
        console.log("Batch puts result", result)
        return remoteIdByLocal
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
    .query("getTemplates", {
      input: z.array(id),
      async resolve(req) {
        const getBatches = req.input.map((id) =>
          template.getBatch({ id, sk: "a" })
        )
        // highTODO paginate, handle errors and missing ids https://github.com/jeremydaly/dynamodb-toolbox/issues/197
        const batch = await (ivy.batchGet(getBatches) as Promise<
          PromiseResult<DocumentClient.BatchGetItemOutput, AWSError>
        >)
        const r = batch.Responses?.[config.IVY_TABLE] ?? []
        return z.array(remoteTemplate).parse(r)
      },
    })
}
const invokedAppRouter = appRouter()
export type AppRouter = typeof invokedAppRouter
