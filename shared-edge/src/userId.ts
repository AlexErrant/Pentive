import { type JWTVerifyResult, jwtVerify } from 'jose'
import {
	type Result,
	type UserId,
	csrfHeaderName,
	toError,
	hubSessionCookieName,
	toOk,
} from 'shared'
import { type Context } from 'hono'
import { base64ToArray } from './utility'

export async function getUserId<T extends { hubSessionSecret: string }>(
	c: Context<{
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Bindings: T
	}>,
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

let hubSessionSecret: null | Uint8Array = null

function getHubSessionSecret(hubSessionSecretString: string): Uint8Array {
	if (hubSessionSecret === null) {
		hubSessionSecret = base64ToArray(hubSessionSecretString)
	}
	return hubSessionSecret
}
