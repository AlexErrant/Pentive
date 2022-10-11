import { z } from "zod"

export const id = z.string().uuid() // highTODO are we doing ULIDs, KSUID, or neither?
