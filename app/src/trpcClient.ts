import {
	TRPCClientError,
	createTRPCProxyClient,
	httpBatchLink,
} from '@trpc/client'
import type { AppRouter as CwaAppRouter } from 'cwa/src/router'
import type { AppRouter as AugcAppRouter } from 'api-ugc/src/router'
import { csrfHeaderName } from 'shared'
import superjson from 'superjson'

export const cwaClient = createTRPCProxyClient<CwaAppRouter>({
	links: [
		httpBatchLink({
			url: import.meta.env.VITE_CWA_URL + 'trpc',
			headers: {
				[csrfHeaderName]: '',
			},
			async fetch(url, options) {
				// medTODO wrap with error handling. Also wrap ALL our fetches with error handling.
				return await fetch(url, {
					...options,
					credentials: 'include',
				})
			},
		}),
	],
	transformer: superjson,
})

export const augcClient = createTRPCProxyClient<AugcAppRouter>({
	links: [
		httpBatchLink({
			url: import.meta.env.VITE_AUGC_URL + 'trpc',
		}),
	],
	transformer: superjson,
})

// https://trpc.io/docs/client/vanilla/infer-types#infer-trpcclienterror-types
export function isTrpcClientError(
	cause: unknown,
): cause is TRPCClientError<AugcAppRouter | CwaAppRouter> {
	return cause instanceof TRPCClientError
}
