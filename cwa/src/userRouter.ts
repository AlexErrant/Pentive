import { type PeerJsId } from "shared"
import { z } from "zod"
import { authedProcedure } from "./trpc"
import { getUserPeer, setUserPeer } from "shared-edge"

export const userRouter = {
  getPeer: authedProcedure.query(
    async ({ ctx }) => await getUserPeer(ctx.user)
  ),
  setPeer: authedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input, ctx }) => {
      await setUserPeer(ctx.user, input as PeerJsId)
    }),
}
