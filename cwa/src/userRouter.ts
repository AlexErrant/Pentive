import { peerDisplayNameValidator, peerIdValidator } from "shared"
import { z } from "zod"
import { authedProcedure, publicProcedure } from "./trpc"
import { getUserPeer, setUserPeer } from "shared-edge"
import { getPeerToken } from "./peerSync"

export const userRouter = {
  getPeer: authedProcedure.query(
    async ({ ctx }) => await getUserPeer(ctx.user)
  ),
  setPeer: authedProcedure
    .input(
      z.object({
        peerId: peerIdValidator,
        displayName: peerDisplayNameValidator,
      })
    )
    .mutation(async ({ input, ctx }) => {
      await setUserPeer(ctx.user, input.peerId, input.displayName)
    }),
  getPeerSyncToken: authedProcedure.query(
    async ({ ctx }) => await getPeerToken(ctx.user, ctx.env.peerSyncPrivateKey)
  ),
  whoAmI: publicProcedure.query((x) => x.ctx.user),
  getPeerSyncPublicKey: publicProcedure.query(
    ({ ctx }) => ctx.env.peerSyncPublicKey
  ),
}
