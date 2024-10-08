/* eslint-disable */
// @ts-nocheck honestly this file should be deleted

import { awsLambdaRequestHandler } from '@trpc/server/adapters/aws-lambda'
import type { CreateAWSLambdaContextOptions } from '@trpc/server/adapters/aws-lambda'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { appRouter } from './appRouter'
import { getUser } from './core'
import { type Context } from './trpc'

// highTODO https://github.com/trpc/trpc/discussions/2371

// run with `npm run rebuild-offline`

// move to Cloudflare when this is complete https://github.com/prisma/prisma/issues/15265

function createContext({
	event,
	context,
}: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>): Context {
	const user = getUser(event.headers.authorization)
	return {
		user,
	}
}

export const handler = awsLambdaRequestHandler({
	router: appRouter,
	createContext,
})
