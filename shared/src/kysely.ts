import { Kysely as RealKysely, sql, InsertResult, RawBuilder } from "kysely"
import { PlanetScaleDialect } from "kysely-planetscale"
import { DB, Post } from "./database"
import { Base64, Hex } from "./brand"

export class Kysely {
  #db: RealKysely<DB>

  constructor(url: string) {
    this.#db = new RealKysely<DB>({
      dialect: new PlanetScaleDialect({
        url,
      }),
    })
  }

  async getPost({
    nook,
  }: {
    nook: string
  }): Promise<Array<Omit<Post, "nook">>> {
    return await this.#db
      .selectFrom("Post")
      .select([
        sql<Base64>`TO_BASE64(id)`.as("id"),
        "title",
        "text",
        "authorId",
      ])
      .where("nook", "=", nook)
      .execute()
  }

  async insertPost({
    authorId,
    nook,
    text,
    title,
    id,
  }: {
    authorId: string
    nook: string
    text: string
    title: string
    id: Hex
  }): Promise<InsertResult[]> {
    return await this.#db
      .insertInto("Post")
      .values({
        id: unhex(id),
        authorId,
        nook,
        text,
        title,
      })
      .execute()
  }
}

function unhex(id: Hex): RawBuilder<Base64> {
  return sql<Base64>`UNHEX(${id})` // nextTODO fix
}
