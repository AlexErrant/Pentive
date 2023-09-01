import { type Context } from 'hono'
import { type JWTVerifyResult, jwtVerify } from 'jose'
import {
	type Result,
	type UserId,
	csrfHeaderName,
	toError,
	hubSessionCookieName,
	toOk,
} from 'shared'
import { getHubSessionSecret } from './env'

export type ApiUgcContext = Context<{
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Bindings: Env
}>

// must be `type` https://github.com/honojs/hono/blob/main/docs/MIGRATION.md#use-type-to-define-the-generics-for-new-hono
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Env = {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	mediaBucket: R2Bucket
	planetscaleDbUrl: string
	appOrigin: string
	hubOrigin: string
	hubSessionSecret: string
}

// changes to this should be copied to CB799051-C477-4F6A-9251-AAF63C347F3A
export async function getUserId(
	c: ApiUgcContext,
): Promise<Result<UserId, Response>> {
	// https://github.com/honojs/hono/pull/884
	if (c.req.header(csrfHeaderName) == null) {
		return toError(c.text(`Missing '${csrfHeaderName}' header`, 401))
	}
	const hubSession = c.req.cookie(hubSessionCookieName)
	if (hubSession == null) {
		return toError(c.text(`Missing '${hubSessionCookieName}' cookie.`, 401))
	} else {
		let verifyResult: JWTVerifyResult
		try {
			verifyResult = await jwtVerify(
				hubSession,
				getHubSessionSecret(c.env.hubSessionSecret),
			)
		} catch {
			return toError(
				c.text(
					`Failed to verify JWT in '${hubSessionCookieName}' cookie.`,
					401,
				),
			)
		}
		if (verifyResult.payload.sub == null) {
			return toError(c.text("There's no sub claim, ya goof.", 401))
		} else {
			return toOk(verifyResult.payload.sub as UserId)
		}
	}
}
