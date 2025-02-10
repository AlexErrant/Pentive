/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:3017/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, ApiUgcContext } from './util'
import {
	setKysely,
	lookupMediaHash,
	getUserId,
	dbIdToBase64,
} from 'shared-edge'
import { appRouter } from './router'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { MediaId, MediaHash } from 'shared/brand'
import { hstsName, hstsValue } from 'shared/headers'

 
const app = new Hono<{ Bindings: Env }>()

declare global {
	// eslint-disable-next-line no-var
	var HUB_ORIGIN: string
	// eslint-disable-next-line no-var
	var APP_ORIGIN: string
}

app
	.use('*', async (c, next) => {
		await next()
		c.header(hstsName, hstsValue)
	})
	.use('/*', async (c, next) => {
		return await cors({
			origin: (x) => (HUB_ORIGIN === x || APP_ORIGIN === x ? x : null),
			allowMethods: ['GET', 'OPTIONS'],
			allowHeaders: [],
			maxAge: 86400, // 24hrs - browsers don't support longer https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age
			credentials: false,
			exposeHeaders: [],
		})(c, next)
	})
	.use('/trpc/*', async (c) => {
		const user = await getUserId(c)
		setKysely(c.env.tursoDbUrl, c.env.tursoAuthToken, c.env.publicMediaSecret)
		return await fetchRequestHandler({
			endpoint: '/trpc',
			req: c.req.raw,
			router: appRouter,
			createContext: () => ({ user, env: c.env }),
		})
	})
	.get('/', (c) => c.text('Hono!!'))
	.get('/i/:mediaId', async (c) => {
		setKysely(c.env.tursoDbUrl, c.env.tursoAuthToken, c.env.publicMediaSecret)
		const mediaId = c.req.param('mediaId').substring(0, 43) as MediaId
		const mediaHash = await lookupMediaHash(mediaId)
		if (mediaHash == null) return await c.notFound()
		return await getMedia(c, mediaHash, 'public')
	})
// .get("/private/:token", async (c) => {
//   const authResult = await getUserId(c)
//   if (authResult.tag === "Error") return authResult.error
//   const userId = authResult.ok
//   const mediaHash = await getMediaHash(
//     c.env.privateMediaSecret,
//     userId,
//     base64url.decode(c.req.param("token"))
//   )
//   if (mediaHash == null) return c.text("Invalid token", 400)
//   const mediaHashBase64 = base64.encode(mediaHash) as Base64
//   return await getMedia(c, mediaHashBase64, "private")
// })

export default app

async function getMedia(
	c: ApiUgcContext,
	mediaHash: MediaHash,
	cacheControl: 'public' | 'private',
) {
	const file = await c.env.mediaBucket.get(dbIdToBase64(mediaHash))
	if (file === null) {
		return await c.notFound()
	}
	c.header('ETag', file.httpEtag)
	c.header('Cross-Origin-Resource-Policy', 'cross-origin')
	const maxAge =
		cacheControl === 'public'
			? 1814400 // 21 days
			: 31536000 // 1 year
	c.header('Expires', new Date(maxAge * 1000 + Date.now()).toUTCString())
	c.header('Cache-Control', `${cacheControl}, max-age=${maxAge}, immutable`)
	if (file.httpMetadata?.contentType != null)
		c.header('Content-Type', file.httpMetadata.contentType)
	if (file.httpMetadata?.contentEncoding != null)
		c.header('Content-Encoding', file.httpMetadata.contentEncoding)
	if (c.req.url.endsWith('.svg')) c.header('Content-Type', 'image/svg+xml')
	return c.body(file.body)
}
