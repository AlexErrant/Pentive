import { type PeerJsId } from "shared"
import { z } from "zod"
import { authedProcedure } from "./trpc"
import { setUserPeer } from "shared-edge"

export const userRouter = {
  setPeer: authedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input, ctx }) => {
      await setUserPeer(ctx.user, input as PeerJsId)
    }),
}
