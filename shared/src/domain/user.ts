import { z } from "zod"

export const peerValidator = z.record(z.string().uuid(), z.string().max(0))

export type PeerValidator = z.infer<typeof peerValidator>
