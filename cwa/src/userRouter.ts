import { type PeerJsId } from "shared"
import { z } from "zod"
import { authedProcedure, publicProcedure } from "./trpc"
import { getUserPeer, setUserPeer } from "shared-edge"
import { getPeerToken } from "./peerSync"

export const userRouter = {
  getPeer: authedProcedure.query(
    async ({ ctx }) => await getUserPeer(ctx.user)
  ),
  setPeer: authedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input, ctx }) => {
      await setUserPeer(ctx.user, input as PeerJsId)
    }),
  getPeerSyncToken: authedProcedure.query(
    async ({ ctx }) => await getPeerToken(ctx.user, ctx.env.peerSyncPrivateKey)
  ),
  getUser: publicProcedure.query((x) => x.ctx.user),
}
