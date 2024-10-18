import { getTemplate } from 'shared-edge'
import { publicProcedure } from './trpc'
import { remoteTemplateId } from 'shared/schema'

export const templateRouter = {
	getTemplate: publicProcedure
		.input(remoteTemplateId)
		.query(async ({ input }) => await getTemplate(input)),
}
