import { z } from "zod"

export const id = z.string().uuid() // highTODO are we doing ULIDs, KSUID, or neither?

export const dateSchema = z.preprocess((arg) => {
  if (typeof arg === "string" || arg instanceof Date) return new Date(arg)
}, z.date())
