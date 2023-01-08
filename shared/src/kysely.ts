import { Kysely as RealKysely, sql, InsertResult, RawBuilder } from "kysely"
import { PlanetScaleDialect } from "kysely-planetscale"
import { DB } from "./database"
import { Base64, Base64Url, DbId, Hex } from "./brand"
import { binary16toBase64URL } from "./util"

const id = sql<Base64>`TO_BASE64(id)`.as("id")

export class Kysely {
  #db: RealKysely<DB>

  constructor(url: string) {
    this.#db = new RealKysely<DB>({
      dialect: new PlanetScaleDialect({
        url,
      }),
    })
  }

  async getPosts({ nook }: { nook: string }): Promise<
    Array<{
      id: Base64Url
      title: string
      text: string
      authorId: string
    }>
  > {
    return await this.#db
      .selectFrom("Post")
      .select([id, "title", "text", "authorId"])
      .where("nook", "=", nook)
      .execute()
      .then((ps) => ps.map((p) => ({ ...p, id: binary16toBase64URL(p.id) })))
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

function unhex(id: Hex): RawBuilder<DbId> {
  return sql<DbId>`UNHEX(${id})`
}
