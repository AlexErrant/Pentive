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
import type {
	Env,
	CwaContext,
	PostMediaQueryKey,
	PostMediaQueryValue,
} from './util'
import {
	setKysely,
	db,
	fromBase64Url,
	userOwnsNoteAndHasMedia,
	userOwnsTemplateAndHasMedia,
	getUserId,
	dbIdToBase64,
	serializeStatus,
	buildPublicToken,
} from 'shared-edge'
import { connect } from '@planetscale/database'
import { buildPrivateToken } from './privateToken'
import { appRouter } from './router'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type {
	UserId,
	MediaHash,
	Base64Url,
	NoteId,
	TemplateId,
	RemoteMediaId,
	RemoteNoteId,
	RemoteTemplateId,
	DbId,
} from 'shared/brand'
import { hstsName, hstsValue } from 'shared/headers'
import { objEntries, objKeys } from 'shared/utility'
import z from 'zod'
import { remoteMediaId, remoteTemplateNoteId } from 'shared/schema'
import type { RawBuilder } from 'kysely'
export type * from '@trpc/server'

 
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
			allowMethods: ['POST', 'GET', 'OPTIONS'],
			allowHeaders: [],
			maxAge: 86400, // 24hrs - browsers don't support longer https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age
			credentials: true,
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
	.post('/private', async (c) => {
		const authResult = await getUserId(c)
		if (authResult.tag === 'Error') return c.text(authResult.error, 401)
		const userId = authResult.ok
		const buildToken = async (mediaHash: MediaHash): Promise<Base64Url> =>
			await buildPrivateToken(c.env.privateMediaSecret, mediaHash, userId)
		const persistDbAndBucket = async ({
			hash,
			readable,
			headers,
		}: PersistParams): Promise<undefined> => {
			await connect({
				// nextTODO
				url: c.env.tursoDbUrl,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- medTODO remove https://github.com/planetscale/database-js/pull/102#issuecomment-1508219636
				fetch: async (url: string, init: any) => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					delete init.cache
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					return await fetch(url, init)
				},
			}).transaction(async (tx) => {
				// Not a "real" transaction since the final `COMMIT` still needs to be sent as a fetch, but whatever.
				// Just means we could PUT something into the mediaBucket and have no record of it in PlanetScale. Not great, but _fine_.
				// Grep BC34B055-ECB7-496D-9E71-58EE899A11D1 for details.
				const countResponse = await tx.execute(
					`SELECT (SELECT COUNT(*) FROM Media_User WHERE mediaHash=? AND userId=?),
                  (SELECT COUNT(*) FROM Media_User WHERE mediaHash=?)`,
					[hash, userId, hash],
					{ as: 'array' },
				)
				const userCount = (countResponse.rows[0] as string[])[0]
				const mediaCount = (countResponse.rows[0] as string[])[1]
				if (userCount === '0') {
					await tx.execute(
						'INSERT INTO Media_User (mediaHash, userId) VALUES (?, ?)',
						[hash, userId],
					)
					if (mediaCount === '0') {
						const mediaHashBase64 = dbIdToBase64(hash)
						const object = await c.env.mediaBucket.put(
							mediaHashBase64,
							readable,
							{
								httpMetadata: headers,
							},
						)
						c.header('ETag', object.httpEtag)
					}
				}
			})
			return undefined
		}
		return await postMedia(c, persistDbAndBucket, buildToken)
	})
	.post('/media/note', async (c) => {
		const mediaIdByEntityIds = mediaIdByEntityIdsValidator.parse(c.req.query())
		const noteIds = objKeys(mediaIdByEntityIds)
		if (noteIds.length === 0) return c.text(`Need at least one note.`, 400)
		return await postPublicMedia(
			c,
			'note',
			async (authorId: UserId, mediaHash: MediaHash) =>
				await userOwnsNoteAndHasMedia(
					noteIds as RemoteNoteId[],
					authorId,
					mediaHash,
				),
			mediaIdByEntityIds,
		)
	})
	.post('/media/template', async (c) => {
		const mediaIdByEntityIds = mediaIdByEntityIdsValidator.parse(c.req.query())
		const templateIds = objKeys(mediaIdByEntityIds)
		if (templateIds.length === 0)
			return c.text(`Need at least one template.`, 400)
		return await postPublicMedia(
			c,
			'template',
			async (authorId: UserId, mediaHash: MediaHash) =>
				await userOwnsTemplateAndHasMedia(
					templateIds as RemoteTemplateId[],
					authorId,
					mediaHash,
				),
			mediaIdByEntityIds,
		)
	})

const mediaIdByEntityIdsValidator = z.record(
	remoteTemplateNoteId satisfies z.Schema<PostMediaQueryKey>,
	remoteMediaId satisfies z.Schema<PostMediaQueryValue>,
)

export default app

async function postPublicMedia(
	c: CwaContext,
	type: 'note' | 'template',
	userOwnsAndHasMedia: (
		authorId: UserId,
		id: MediaHash,
	) => Promise<{
		userOwns: boolean
		hasMedia: boolean
	}>,
	mediaIdByEntityIds: Record<NoteId | TemplateId, RemoteMediaId>,
) {
	const authResult = await getUserId(c)
	if (authResult.tag === 'Error') return c.text(authResult.error, 401)
	const userId = authResult.ok
	setKysely(c.env.tursoDbUrl, c.env.tursoAuthToken, c.env.publicMediaSecret)
	const persistDbAndBucket = async ({
		hash,
		readable,
		headers,
	}: PersistParams): Promise<undefined | Response> => {
		const { userOwns, hasMedia } = await userOwnsAndHasMedia(userId, hash)
		if (!userOwns)
			return c.text(`You don't own one (or more) of these ${type}s.`, 401)
		const insertValues = [] as Array<{
			hash: MediaHash
			id: RawBuilder<DbId>
			entityId: RawBuilder<DbId>
		}>
		for (const [entityId, mediaId] of objEntries(mediaIdByEntityIds)) {
			const expectedId = await buildPublicToken(
				entityId,
				new Uint8Array(hash),
				c.env.publicMediaSecret,
			)
			if (mediaId !== expectedId)
				return c.text(
					`Integrity check failed - uploaded content doesn't have the expected entityId or hash.`,
					400,
				)
			insertValues.push({
				hash,
				id: fromBase64Url(mediaId),
				entityId: fromBase64Url(entityId),
			})
		}
		await db
			.transaction()
			// Not a "real" transaction since the final `COMMIT` still needs to be sent as a fetch, but whatever.
			// Just means we could PUT something into the mediaBucket and have no record of it in PlanetScale. Not great, but _fine_.
			// Grep BC34B055-ECB7-496D-9E71-58EE899A11D1 for details.
			.execute(async (trx) => {
				await trx.insertInto('media').values(insertValues).execute()
				await trx
					.updateTable(type)
					.set({
						status: serializeStatus('draft'),
					})
					.where(
						'id',
						'in',
						insertValues.map((x) => x.entityId),
					)
					.execute()
				if (!hasMedia) {
					const object = await c.env.mediaBucket.put(
						dbIdToBase64(hash),
						readable,
						{
							httpMetadata: headers,
						},
					)
					c.header('ETag', object.httpEtag)
				}
			})
	}
	return await postMedia(c, persistDbAndBucket, () => '')
}

async function postMedia(
	c: CwaContext,
	persistDbAndBucket: (_: PersistParams) => Promise<undefined | Response>,
	buildResponse: (mediaHash: MediaHash) => string | Promise<string>,
): Promise<Response> {
	if (c.req.raw.body === null) {
		return c.text('Missing body', 400)
	}
	const contentLength = c.req.raw.headers.get('content-length')
	if (contentLength === null) {
		return c.text('Missing `content-length` header', 400)
	}
	const contentLengthInt = parseInt(contentLength)
	if (isNaN(contentLengthInt)) {
		return c.text('`content-length` must be an int', 400)
	} else if (contentLengthInt <= 0) {
		return c.text('`content-length` must be larger than 0', 400)
	} else if (contentLengthInt > 2097152) {
		return c.text(
			'`content-length` must be less than 2,097,152 bytes (2 MB).',
			400,
		)
	}

	const [responseBody, hashBody] = c.req.raw.body.tee()
	const { readable, writable } = new FixedLengthStream(parseInt(contentLength)) // validates length
	void responseBody.pipeTo(writable) // https://developers.cloudflare.com/workers/learning/using-streams
	const headers = new Headers()
	const ct = c.req.raw.headers.get('Content-Type')
	if (ct != null) headers.set('Content-Type', ct)
	const ce = c.req.raw.headers.get('Content-Encoding')
	if (ce != null) headers.set('Content-Encoding', ce)

	const digestStream = new crypto.DigestStream('SHA-256') // https://developers.cloudflare.com/workers/runtime-apis/web-crypto/#constructors
	void hashBody.pipeTo(digestStream)
	const hash = (await digestStream.digest) as MediaHash

	const response = await buildResponse(hash)
	const r = await persistDbAndBucket({
		hash,
		readable,
		headers,
	})
	if (r != null) return r
	return c.text(response, 201)
}

interface PersistParams {
	hash: MediaHash
	readable: ReadableStream<Uint8Array>
	headers: Headers
}
