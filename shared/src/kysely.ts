import { Kysely as RealKysely } from "kysely"
import { PlanetScaleDialect } from "kysely-planetscale"
import { DB, Post } from "./database"

export class Kysely {
  #db: RealKysely<DB>

  constructor(url: string) {
    this.#db = new RealKysely<DB>({
      dialect: new PlanetScaleDialect({
        url,
      }),
    })
  }

  async getPost({ nook }: { nook: string }): Promise<Post[]> {
    return await this.#db
      .selectFrom("Post")
      .where("nook", "=", nook)
      .selectAll()
      .execute()
  }
}
