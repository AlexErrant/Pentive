import { z } from "zod"
import { type PeerDisplayName, type PeerJsId } from "../brand"

export const peerDisplayNameValidator = z
  .string()
  .max(20) as unknown as z.Schema<PeerDisplayName>

export const peerIdValidator = z
  .string()
  .uuid() as unknown as z.Schema<PeerJsId>

export const peerValidator = z.record(peerIdValidator, peerDisplayNameValidator)

export type PeerValidator = z.infer<typeof peerValidator>
