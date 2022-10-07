import express from "express"
import { buildSchema } from "graphql"
import { GRAPHQL_PORT, GRAPHQL_PATH, graphQLGenerationInput } from "../shared"

import { graphQLSchemaFromRxSchema } from "rxdb/plugins/replication-graphql"

import { graphqlHTTP } from "express-graphql"
import cors from "cors"
import { heroSync } from "./hero"
import { deepMutable, log } from "./util"

export function run(): void {
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
  const root = heroSync

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
