import { z } from "zod"
import { type PeerDisplayName, type PeerJsId } from "../brand"

export const peerDisplayNameValidator = z
  .string()
  .max(20) as unknown as z.Schema<PeerDisplayName>

export const peerIdValidator = z
  .string()
  .uuid() as unknown as z.Schema<PeerJsId>

export const peerValidator = z.record(peerIdValidator, peerDisplayNameValidator)
export type PeerValidator = Record<PeerJsId, PeerDisplayName> // don't infer; grep E7F24704-8D0B-460A-BF2C-A97344C535E0
