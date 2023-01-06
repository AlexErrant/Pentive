import { Kysely as RealKysely, sql } from "kysely"
import { PlanetScaleDialect } from "kysely-planetscale"
import { DB, Post } from "./database"
import { Base64 } from "./brand"

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
}
