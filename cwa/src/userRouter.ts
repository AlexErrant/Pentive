import { z } from 'zod'
import { enticatedProcedure, publicProcedure } from './trpc'
import { getUserPeer, setUserPeer } from 'shared-edge'
import { getPeerToken } from './peerSync'
import { peerDisplayNameValidator, peerIdValidator } from 'shared/domain/user'

export const userRouter = {
	getPeer: enticatedProcedure.query(
		async ({ ctx }) => await getUserPeer(ctx.user),
	),
	setPeer: enticatedProcedure
		.input(
			z.object({
				peerId: peerIdValidator,
				displayName: peerDisplayNameValidator,
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await setUserPeer(ctx.user, input.peerId, input.displayName)
		}),
	getPeerSyncToken: enticatedProcedure.query(
		async ({ ctx }) => await getPeerToken(ctx.user, ctx.env.peerSyncPrivateKey),
	),
	whoAmI: publicProcedure.query((x) => x.ctx.user),
	getPeerSyncPublicKey: publicProcedure.query(
		({ ctx }) => ctx.env.peerSyncPublicKey,
	),
}
