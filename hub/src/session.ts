import { jwtVerify, type JWTVerifyResult, SignJWT } from 'jose'
import {
	base64url,
	csrfSignatureCookieName,
	hubSessionCookieName,
	throwExp,
	type UserId,
} from 'shared'
import { base64ToArray } from 'shared-edge'
import { redirect } from '@solidjs/router'
import { type CookieSerializeOptions } from 'vinxi/http'
import { Cookie } from '~/createPlainCookie'
import { getRequestEvent } from 'solid-js/web'
import { type EnvVars } from './env'

const sessionCookieOpts: CookieSerializeOptions = {
	secure: true,
	// nextTODO
	// secrets: [], // intentionally empty. This cookie should only store a signed JWT!
	sameSite: 'strict',
	path: '/',
	maxAge: 60 * 60 * 24 * 30, // 30 days
	httpOnly: true,
	domain: import.meta.env.VITE_HUB_DOMAIN, // sadly, making cookies target specific subdomains from the main domain seems very hacky
	// expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
}
const sessionCookie = new Cookie(hubSessionCookieName, sessionCookieOpts)
const destroySessionCookie = new Cookie(hubSessionCookieName, {
	...sessionCookieOpts,
	maxAge: undefined,
	expires: new Date(0), // https://github.com/remix-run/remix/issues/5150 https://stackoverflow.com/q/5285940
})
// lowTODO store this on the client in a cross-domain compatible way - it need not be a cookie https://stackoverflow.com/q/34790887
const csrfSignatureCookieOpts: CookieSerializeOptions = {
	secure: true,
	// nextTODO
	// secrets: [], // intentionally empty. This cookie only stores an HMACed CSRF token.
	sameSite: 'strict',
	path: '/',
	maxAge: 60 * 60 * 24 * 30, // 30 days
	httpOnly: false,
	domain: import.meta.env.VITE_HUB_DOMAIN, // sadly, making cookies target specific subdomains from the main domain seems very hacky
	// expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
}
const csrfSignatureCookie = new Cookie(
	csrfSignatureCookieName,
	csrfSignatureCookieOpts,
)
const destroyCsrfSignatureCookie = new Cookie(csrfSignatureCookieName, {
	...csrfSignatureCookieOpts,
	maxAge: undefined,
	expires: new Date(0), // https://github.com/remix-run/remix/issues/5150 https://stackoverflow.com/q/5285940
})

const oauthStateCookieOpts: CookieSerializeOptions = {
	secure: true,
	// nextTODO
	// secrets: [x.oauthStateSecret], // encrypted due to https://security.stackexchange.com/a/140889
	sameSite: 'lax',
	path: '/',
	maxAge: 60 * 60 * 24, // 1 day
	httpOnly: true,
	// domain: "", // intentionally missing to exclude subdomains
	// expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
}
const oauthStateCookieName = '__Host-oauthState'
const oauthStateCookie = new Cookie(oauthStateCookieName, oauthStateCookieOpts)
const destroyOauthStateCookie = new Cookie(oauthStateCookieName, {
	...oauthStateCookieOpts,
	maxAge: undefined,
	expires: new Date(0), // https://github.com/remix-run/remix/issues/5150 https://stackoverflow.com/q/5285940
})

const oauthCodeVerifierCookieOpts: CookieSerializeOptions = {
	secure: true,
	// nextTODO
	// secrets: [x.oauthCodeVerifierSecret], // encrypted due to https://stackoverflow.com/a/67520418 https://stackoverflow.com/a/67979777
	sameSite: 'lax',
	path: '/',
	maxAge: 60 * 60 * 24, // 1 day
	httpOnly: true,
	// domain: "", // intentionally missing to exclude subdomains
	// expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
}
const oauthCodeVerifierCookieName = '__Host-oauthCodeVerifier'
const oauthCodeVerifierCookie = new Cookie(
	oauthCodeVerifierCookieName,
	oauthCodeVerifierCookieOpts,
)
const destroyOauthCodeVerifierCookie = new Cookie(oauthCodeVerifierCookieName, {
	...oauthCodeVerifierCookieOpts,
	maxAge: undefined,
	expires: new Date(0), // https://github.com/remix-run/remix/issues/5150 https://stackoverflow.com/q/5285940
})

const hubInfoCookieOpts: CookieSerializeOptions = {
	secure: true,
	// nextTODO
	// secrets: [], // intentionally empty. This cookie only stores an HMACed JWT.
	sameSite: 'strict',
	path: '/',
	maxAge: 60 * 60 * 2, // 2 hours
	httpOnly: true,
	// domain: "", // intentionally missing to exclude subdomains
	// expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
}
const hubInfoCookieName = '__Host-hubInfo'
const hubInfoCookie = new Cookie(hubInfoCookieName, hubInfoCookieOpts)

export const env = () => {
	const env =
		getRequestEvent()!.nativeEvent.context.cloudflare?.env ??
		(process.env as unknown as EnvVars)
	return {
		...env,
		hubSessionSecret: base64ToArray(env.hubSessionSecret),
		hubInfoSecret: base64ToArray(env.hubInfoSecret),
	}
}

export function getCsrfSignature() {
	const cookie = getRequestEvent()!.request.headers.get('Cookie')
	const csrfSignature = csrfSignatureCookie.parse(cookie)
	if (typeof csrfSignature !== 'string' || csrfSignature.length === 0) {
		return null
	}
	return csrfSignature
}

export function getOauthState(request: Request) {
	const state = oauthStateCookie.parse(request.headers.get('Cookie')) as unknown
	if (typeof state !== 'string' || state.length === 0) {
		throw new Error('oauth state is empty or not a string')
	}
	return state
}

export function getOauthCodeVerifier(request: Request) {
	const codeVerifier = oauthCodeVerifierCookie.parse(
		request.headers.get('Cookie'),
	) as unknown
	if (typeof codeVerifier !== 'string' || codeVerifier.length === 0) {
		throw new Error('oauth codeVerifier is empty or not a string')
	}
	return codeVerifier
}

export interface HubSession {
	sub: UserId
	jti: string
}

export async function getSession() {
	const cookie = getRequestEvent()!.request.headers.get('Cookie')
	const rawSession = sessionCookie.parse(cookie)
	if (rawSession == null) return null
	let session: JWTVerifyResult | null = null
	try {
		session = await jwtVerify(rawSession, env().hubSessionSecret)
	} catch {}
	return session == null
		? null
		: {
				sub: (session.payload.sub as UserId) ?? throwExp('`sub` is empty'),
				jti: session.payload.jti ?? throwExp('`jti` is empty'),
			}
}

export async function getUserId() {
	const session = await getSession()
	return session?.sub ?? null
}

export async function requireUserId(redirectTo?: string) {
	const r = await getUserId()
	if (r == null) {
		redirectTo ??= new URL(getRequestEvent()!.request.url).pathname
		const searchParams = new URLSearchParams([['redirectTo', redirectTo]])
		throw redirect(`/login?${searchParams.toString()}`) as unknown
	}
	return r
}

export function requireCsrfSignature(redirectTo?: string) {
	const csrfSignature = getCsrfSignature()
	if (csrfSignature == null) {
		redirectTo ??= new URL(getRequestEvent()!.request.url).pathname
		const searchParams = new URLSearchParams([['redirectTo', redirectTo]])
		throw redirect(`/login?${searchParams.toString()}`) as unknown
	}
	return csrfSignature
}

export async function requireSession(redirectTo?: string) {
	const session = await getSession()
	if (session == null) {
		redirectTo ??= new URL(getRequestEvent()!.request.url).pathname
		const searchParams = new URLSearchParams([['redirectTo', redirectTo]])
		throw redirect(`/login?${searchParams.toString()}`) as unknown
	}
	return session
}

export function logout() {
	const headers = new Headers()
	headers.append('Set-Cookie', destroySessionCookie.serialize('')) // lowTODO parallelize
	headers.append('Set-Cookie', destroyCsrfSignatureCookie.serialize('')) // lowTODO parallelize
	return redirect('/login', {
		headers,
	})
}

export async function createUserSession(
	userId: string,
	redirectTo: string,
): Promise<Response> {
	const [csrf, csrfSignature] = await generateCsrf()
	const headers = new Headers()
	const session = await generateSession(userId, csrf)
	headers.append('Set-Cookie', sessionCookie.serialize(session)) // lowTODO parallelize
	// https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie
	// If you ever separate csrf from the session cookie https://security.stackexchange.com/a/220810 https://security.stackexchange.com/a/248434
	// REST endpoints may need csrf https://security.stackexchange.com/q/166724
	headers.append('Set-Cookie', csrfSignatureCookie.serialize(csrfSignature))
	headers.append('Set-Cookie', destroyOauthStateCookie.serialize(''))
	headers.append('Set-Cookie', destroyOauthCodeVerifierCookie.serialize(''))
	return redirect(redirectTo, {
		headers,
	})
}

export function createLoginHeaders(state: string, codeVerifier: string) {
	const headers = new Headers()
	headers.append('Set-Cookie', oauthStateCookie.serialize(state))
	headers.append('Set-Cookie', oauthCodeVerifierCookie.serialize(codeVerifier))
	return headers
}

export async function createInfoHeaders(info: string) {
	// could use crypto.subtle instead of a JWT for less overhead, but I'm tired of subtle and thinking in binary
	const infoJwt = await new SignJWT({ info })
		.setProtectedHeader({ alg })
		.setExpirationTime('2h')
		.sign(await getHubInfoKey())
	const headers = new Headers()
	headers.append('Set-Cookie', hubInfoCookie.serialize(infoJwt))
	return headers
}

export async function getInfo(request: Request) {
	const rawInfoJwt = hubInfoCookie.parse(request.headers.get('Cookie'))
	if (typeof rawInfoJwt !== 'string' || rawInfoJwt.length === 0) {
		return null
	}
	let jwt: JWTVerifyResult | null = null
	try {
		jwt = await jwtVerify(rawInfoJwt, env().hubInfoSecret)
	} catch {}
	return jwt == null
		? null
		: ((jwt.payload.info as string) ?? throwExp('`info` is empty'))
}

async function generateSession(userId: string, csrf: string): Promise<string> {
	return await new SignJWT({})
		.setProtectedHeader({ alg })
		.setSubject(userId)
		.setJti(csrf) // use 256-bit csrf as JTI https://www.rfc-editor.org/rfc/rfc7519#section-4.1.7 https://security.stackexchange.com/a/220810 https://security.stackexchange.com/a/248434
		// .setNotBefore() // highTODO
		// .setIssuedAt()
		// .setIssuer("urn:example:issuer")
		// .setAudience("urn:example:audience")
		// .setExpirationTime("2h")
		.sign(env().hubSessionSecret)
}

let maybeCsrfKey: CryptoKey | null = null
async function getCsrfKey(): Promise<CryptoKey> {
	if (maybeCsrfKey == null) {
		maybeCsrfKey = await crypto.subtle.importKey(
			'raw',
			base64ToArray(env().csrfSecret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign', 'verify'],
		)
	}
	return maybeCsrfKey
}

let maybeHubInfoKey: CryptoKey | null = null
async function getHubInfoKey(): Promise<CryptoKey> {
	if (maybeHubInfoKey == null) {
		maybeHubInfoKey = await crypto.subtle.importKey(
			'raw',
			env().hubInfoSecret,
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign', 'verify'],
		)
	}
	return maybeHubInfoKey
}

async function generateCsrf(): Promise<[string, string]> {
	const csrfBytes = crypto.getRandomValues(new Uint8Array(32))
	const csrfKey = await getCsrfKey()
	const csrfSignature = await crypto.subtle.sign('HMAC', csrfKey, csrfBytes)
	return [
		base64url.encode(csrfBytes).substring(0, 43),
		base64url.encode(new Uint8Array(csrfSignature)).substring(0, 43),
	]
}

export async function isInvalidCsrf(
	csrfSignature: string,
	csrf: string,
): Promise<boolean> {
	const csrfKey = await getCsrfKey()
	const signature = base64url.decode(csrfSignature + '=')
	const data = base64url.decode(csrf + '=')
	const isValid = await crypto.subtle.verify('HMAC', csrfKey, signature, data)
	return !isValid
}

const alg = 'HS256'
