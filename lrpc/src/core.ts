import { jwtVerify } from 'jose'
import { hubSessionSecret } from './config'
import { parse } from 'cookie-es'
import { type IncomingHttpHeaders } from 'http'
import { hubSessionCookieName, csrfHeaderName } from 'shared/headers'

export async function getUser(
	headers: IncomingHttpHeaders,
): Promise<string | undefined> {
	if (headers.cookie != null) {
		const cookies = parse(headers.cookie)
		const sessionCookie = cookies[hubSessionCookieName]
		if (sessionCookie != null && csrfHeaderName in headers) {
			try {
				const session = await jwtVerify(sessionCookie, hubSessionSecret)
				return session.payload.sub
			} catch {
				//
			}
		}
	}
	return undefined
}

// https://stackoverflow.com/a/65666402
export function throwExp(errorMessage: string): never {
	throw new Error(errorMessage)
}

export function optionMap<T, R>(
	t: T | null | undefined,
	f: (_: T) => R,
): R | null | undefined {
	if (t == null) {
		return t as null | undefined
	}
	return f(t)
}
