import { Base64Url, NoteId, throwExp } from "shared"
import z from "zod"

const noteId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<NoteId>

export const iByNoteIdsValidator = z.record(
  noteId,
  z.coerce.number().int().min(0).max(255)
)

/*

`token` is `entityId` + `i`.

         token
 __________/\__________
/                      \
EqbOG7eOQ8edDQAAiBlWPA11
\_________  _________/\/
          \/           i
       entityId

*/

export function parsePublicToken(token: string): [Base64Url, number] {
  const entityId = token.substring(0, 22) as Base64Url
  const i = parseInt(token.substring(22))
  if (isNaN(i)) {
    throwExp(`${i} is not a number.`)
  }
  return [entityId, i]
}
