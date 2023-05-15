import { z } from "zod"
import { type PluginId } from "./brand"

export interface Plugin {
  readonly name: string
  readonly id: PluginId
  readonly created: Date
  readonly updated: Date
  readonly script: Blob
}

export const packageJsonValidator = z.object({
  name: z.string(),
  main: z.string().optional(),
})
