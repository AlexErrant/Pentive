import express from "express"
import { buildSchema } from "graphql"
import _ from "lodash"
import {
  GRAPHQL_PORT,
  GRAPHQL_PATH,
  graphQLGenerationInput,
  JWT_BEARER_TOKEN,
} from "../shared"

import { graphQLSchemaFromRxSchema } from "rxdb/plugins/replication-graphql"

import { RxReplicationWriteToMasterRow } from "rxdb"
import { graphqlHTTP } from "express-graphql"
import cors from "cors"

interface Hero {
  id: string
  name: string
  color: string
  updatedAt: number
}

type HeroCheckpoint = Pick<
  Hero,
  typeof graphQLGenerationInput.hero.checkpointFields[number]
>

function log(msg: unknown): void {
  const prefix = "# GraphQL Server: "
  if (typeof msg === "string") {
    console.log(prefix + msg)
  } else {
    console.log(prefix + JSON.stringify(msg, null, 2))
  }
}

function sortByUpdatedAtAndPrimary(a: Hero, b: Hero): 1 | 0 | -1 {
  if (a.updatedAt > b.updatedAt) return 1
  if (a.updatedAt < b.updatedAt) return -1

  if (a.updatedAt === b.updatedAt) {
    if (a.id > b.id) return 1
    if (a.id < b.id) return -1
    else return 0
  }
  throw Error("Impossible")
}

/**
 * Returns true if the request is authenticated
 * throws if not.
 * In a real world app you would parse and validate the bearer token.
 * @link https://graphql.org/graphql-js/authentication-and-express-middleware/
 */
export function authenticateRequest(request: express.Request): void {
  const authHeader = request.header("authorization")
  if (authHeader === undefined) throw new Error("not authenticated")
  const splitted = authHeader.split(" ")
  const token = splitted[1]
  validateBearerToken(token)
}

export function validateBearerToken(token: string): boolean {
  if (token === JWT_BEARER_TOKEN) {
    return true
  } else {
    console.log("token not valid " + token)
    throw new Error("not authenticated")
  }
}

// https://stackoverflow.com/a/58716315
type DeepMutable<T> = T extends object
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T
const deepMutable = <T>(t: T): DeepMutable<T> => t as DeepMutable<T>

export function run(): void {
  let documents: Hero[] = []
  const app = express()
  app.use(cors())

  /**
   * In this example we generate the GraphQL schema from the RxDB schema.
   * Of course you could also write it by hand or extend and existing one.
   */
  const generatedSchema = graphQLSchemaFromRxSchema(
    deepMutable(graphQLGenerationInput)
  )
  const graphQLSchema = generatedSchema.asString

  console.log("Server side GraphQL Schema:")
  console.log(graphQLSchema)
  const schema = buildSchema(graphQLSchema)

  // The root provides a resolver function for each API endpoint
  const root = {
    pullHero: (
      args: {
        checkpoint?: HeroCheckpoint
        limit: number
      },
      request: express.Request
    ): {
      checkpoint: HeroCheckpoint
      documents: Hero[]
    } => {
      log("## pullHero()")
      log(args)
      authenticateRequest(request)

      const lastId = args.checkpoint?.id ?? ""
      const minUpdatedAt = args.checkpoint?.updatedAt ?? 0

      // sorted by updatedAt and primary
      const sortedDocuments = documents.sort(sortByUpdatedAtAndPrimary)

      // only return where updatedAt >= minUpdatedAt
      const filterForMinUpdatedAtAndId = sortedDocuments.filter((doc) => {
        if (args.checkpoint == null) {
          return true
        }
        if (doc.updatedAt < minUpdatedAt) {
          return false
        }
        if (doc.updatedAt > minUpdatedAt) {
          return true
        }
        if (doc.updatedAt === minUpdatedAt) {
          if (doc.id > lastId) {
            return true
          } else {
            return false
          }
        }
        throw new Error("impossible")
      })

      // apply limit
      const limitedDocs = filterForMinUpdatedAtAndId.slice(0, args.limit)
      const last = _.last(limitedDocs)
      const ret = {
        documents: limitedDocs,
        checkpoint:
          last !== undefined
            ? {
                id: last.id,
                updatedAt: last.updatedAt,
              }
            : {
                id: lastId,
                updatedAt: minUpdatedAt,
              },
      }
      console.log("pullHero() ret:")
      console.log(JSON.stringify(ret, null, 4))
      return ret
    },
    pushHero: (
      args: { heroPushRow: Array<RxReplicationWriteToMasterRow<Hero>> },
      request: express.Request
    ): Hero[] => {
      log("## pushHero()")
      log(args)
      authenticateRequest(request)

      const rows = args.heroPushRow
      const lastCheckpoint = {
        id: "",
        updatedAt: 0,
      }

      const conflicts: Hero[] = []

      const writtenDocs: Hero[] = []
      rows.forEach((row: RxReplicationWriteToMasterRow<Hero>) => {
        const docId = row.newDocumentState.id
        const docCurrentMaster = documents.find((d) => d.id === docId)

        /**
         * Detect conflicts.
         */
        if (
          docCurrentMaster != null &&
          row.assumedMasterState != null &&
          docCurrentMaster.updatedAt !== row.assumedMasterState.updatedAt
        ) {
          conflicts.push(docCurrentMaster)
          return
        }

        const doc = row.newDocumentState
        documents = documents.filter((d) => d.id !== doc.id)
        documents.push(doc)

        lastCheckpoint.id = doc.id
        lastCheckpoint.updatedAt = doc.updatedAt
        writtenDocs.push(doc)
      })

      console.log("## current documents:")
      console.log(JSON.stringify(documents, null, 4))
      console.log("## conflicts:")
      console.log(JSON.stringify(conflicts, null, 4))

      return conflicts
    },
  }

  // server graphql-endpoint
  app.use(
    GRAPHQL_PATH,
    graphqlHTTP({
      schema,
      rootValue: root,
      graphiql: true,
    })
  )

  app.listen(GRAPHQL_PORT, function () {
    log(
      `Started graphql-endpoint at http://localhost:${GRAPHQL_PORT}${GRAPHQL_PATH}`
    )
  })
}

run()
