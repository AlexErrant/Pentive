import { type JWTVerifyResult, jwtVerify } from 'jose'
import { type Context } from 'hono'
import { getCookie } from 'hono/cookie'
import { base64ToArray } from 'shared/binary'
import { type Base64, type UserId } from 'shared/brand'
import { csrfHeaderName, hubSessionCookieName } from 'shared/headers'
import { toError, toOk } from 'shared/result'

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function getUserId<T extends { hubSessionSecret: Base64 }>(
	c: Context<{
		Bindings: T
	}>,
) {
	// https://github.com/honojs/hono/pull/884
	if (c.req.header(csrfHeaderName) == null) {
		return toError(`Missing '${csrfHeaderName}' header`)
	}
	const hubSession = getCookie(c, hubSessionCookieName)
	if (hubSession == null) {
		return toError(
			`Missing '${hubSessionCookieName}' cookie. (You're not logged into Hub.)`,
		)
	} else {
		let verifyResult: JWTVerifyResult
		try {
			verifyResult = await jwtVerify(
				hubSession,
				getHubSessionSecret(c.env.hubSessionSecret),
			)
		} catch {
			return toError(
				`Failed to verify JWT in '${hubSessionCookieName}' cookie.`,
			)
		}
		if (verifyResult.payload.sub == null) {
			return toError("There's no sub claim, ya goof.")
		} else {
			return toOk(verifyResult.payload.sub as UserId)
		}
	}
}

let hubSessionSecret: null | Uint8Array = null

function getHubSessionSecret(hubSessionSecretString: Base64): Uint8Array {
	if (hubSessionSecret === null) {
		hubSessionSecret = base64ToArray(hubSessionSecretString)
	}
	return hubSessionSecret
}
