import { SignJWT } from 'jose'
import {
	arrayToBase64url,
	base64ToArray,
	base64urlToArray,
} from 'shared/binary'
import { query, redirect } from '@solidjs/router'
import {
	CookieManager,
	EncryptedCookieManager,
	SignedCookieManager,
} from '~/cookieManager'
import { getRequestEvent } from 'solid-js/web'
import type { EnvVars } from './env'
import type { FetchEvent } from '@solidjs/start/server'
import type { Base64Url, UserId } from 'shared/brand'
import { hubSessionCookieName, csrfSignatureCookieName } from 'shared/headers'
import { throwExp } from 'shared/utility'

const sessionMaxAgeSeconds = 60 * 60 * 24 * 30 // 30 days
const sessionCM = new SignedCookieManager(hubSessionCookieName, {
	secure: true,
	sameSite: 'lax',
	path: '/',
	maxAge: sessionMaxAgeSeconds,
	httpOnly: true,
	domain: import.meta.env.VITE_HUB_DOMAIN, // sadly, making cookies target specific subdomains from the main domain seems very hacky
})
// lowTODO store this on the client in a cross-domain compatible way - it need not be a cookie https://stackoverflow.com/q/34790887
// intentionally not encrypted or signed. This cookie only stores an HMACed CSRF token.
const csrfSignatureCM = new CookieManager(csrfSignatureCookieName, {
	secure: true,
	sameSite: 'lax',
	path: '/',
	maxAge: 60 * 60 * 24 * 30, // 30 days
	httpOnly: false,
	domain: import.meta.env.VITE_HUB_DOMAIN, // sadly, making cookies target specific subdomains from the main domain seems very hacky
})

// encrypted due to https://security.stackexchange.com/a/140889
const oauthStateCM = new EncryptedCookieManager('__Host-oauthState', {
	secure: true,
	sameSite: 'lax',
	path: '/',
	maxAge: 60 * 60 * 24, // 1 day
	httpOnly: true,
	// domain: "", // intentionally missing to exclude subdomains
})

// encrypted due to https://stackoverflow.com/a/67520418 https://stackoverflow.com/a/67979777
const oauthCodeVerifierCM = new EncryptedCookieManager(
	'__Host-oauthCodeVerifier',
	{
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 60 * 24, // 1 day
		httpOnly: true,
		// domain: "", // intentionally missing to exclude subdomains
	},
)

const hubInfoMaxAgeSeconds = 60 * 60 * 24 * 30 // 30 days
const hubInfoCM = new SignedCookieManager('__Host-hubInfo', {
	secure: true,
	sameSite: 'lax',
	path: '/',
	maxAge: hubInfoMaxAgeSeconds,
	httpOnly: true,
	// domain: "", // intentionally missing to exclude subdomains
})

let envCache: Env | undefined

export const env = (event?: FetchEvent) => {
	if (envCache != null) return envCache
	envCache =
		(event ?? getRequestEvent()!).nativeEvent.context.cloudflare?.env ??
		(process.env as unknown as EnvVars)
	return envCache
}

export function getCsrfSignature() {
	const cookie = getRequestEvent()!.request.headers.get('Cookie')
	const csrfSignature = csrfSignatureCM.parse(cookie)
	if (typeof csrfSignature !== 'string' || csrfSignature.length === 0) {
		return null
	}
	return csrfSignature
}

export async function getOauthState(request: Request) {
	const cookie = request.headers.get('Cookie')
	return await oauthStateCM.parse(cookie, env().oauthStateSecret)
}

export async function getOauthCodeVerifier(request: Request) {
	const cookie = request.headers.get('Cookie')
	return await oauthCodeVerifierCM.parse(cookie, env().oauthCodeVerifierSecret)
}

export interface HubSession {
	sub: UserId
	jti: CsrfFormat
}

export async function getSession() {
	const event = getRequestEvent()
	if (event == null) return null
	const cookie = event.request.headers.get('Cookie')
	const payload = await sessionCM.parse(cookie, env().hubSessionSecret)
	if (payload == null) return null
	return {
		sub: (payload.sub as UserId | undefined) ?? throwExp(),
		jti: (payload.jti as CsrfFormat | undefined) ?? throwExp(),
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

function requireCsrfSignature(redirectTo: string) {
	const csrfSignature = getCsrfSignature()
	if (csrfSignature == null) {
		const searchParams = new URLSearchParams([['redirectTo', redirectTo]])
		throw redirect(`/login?${searchParams.toString()}`) as unknown
	}
	return csrfSignature
}

// eslint-disable-next-line @typescript-eslint/require-await
export const getCsrfSignatureCached = query(async (pathname: string) => {
	'use server'
	return requireCsrfSignature(pathname)
}, 'csrfSignature')

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
	headers.append('Set-Cookie', sessionCM.clear())
	headers.append('Set-Cookie', csrfSignatureCM.clear())
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
	const expires = new Date(new Date().getTime() + sessionMaxAgeSeconds * 1000)
	const cookie = await sessionCM.serialize(
		new SignJWT({})
			.setSubject(userId)
			// use 256-bit csrf as JTI https://www.rfc-editor.org/rfc/rfc7519#section-4.1.7 https://security.stackexchange.com/a/220810 https://security.stackexchange.com/a/248434
			.setJti(csrf)
			// .setNotBefore() // highTODO
			// .setIssuedAt()
			// .setIssuer("urn:example:issuer")
			// .setAudience("urn:example:audience")
			.setExpirationTime(expires),
		env().hubSessionSecret,
	)
	headers.append('Set-Cookie', cookie)
	// https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie
	// If you ever separate csrf from the session cookie https://security.stackexchange.com/a/220810 https://security.stackexchange.com/a/248434
	// REST endpoints may need csrf https://security.stackexchange.com/q/166724
	headers.append('Set-Cookie', csrfSignatureCM.serialize(csrfSignature))
	headers.append('Set-Cookie', oauthStateCM.clear())
	headers.append('Set-Cookie', oauthCodeVerifierCM.clear())
	return redirect(redirectTo, {
		headers,
	})
}

export async function createLoginHeaders(
	oauthState: string,
	codeVerifier: string,
) {
	const headers = new Headers()
	const [oauthStateCookie, codeVerifierCookie] = await Promise.all([
		oauthStateCM.serialize(oauthState, env().oauthStateSecret),
		oauthCodeVerifierCM.serialize(codeVerifier, env().oauthCodeVerifierSecret),
	])
	headers.append('Set-Cookie', oauthStateCookie)
	headers.append('Set-Cookie', codeVerifierCookie)
	return headers
}

export async function createInfoHeaders(info: string) {
	const expires = new Date(new Date().getTime() + hubInfoMaxAgeSeconds * 1000)
	const infoJwt = new SignJWT({ info }).setExpirationTime(expires)
	const headers = new Headers()
	headers.append(
		'Set-Cookie',
		await hubInfoCM.serialize(infoJwt, env().hubInfoSecret),
	)
	return headers
}

export async function getInfo(request: Request) {
	const payload = await hubInfoCM.parse(
		request.headers.get('Cookie'),
		env().hubInfoSecret,
	)
	if (payload == null) return null
	return (payload.info as string | undefined) ?? throwExp()
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

export type CsrfFormat = Base64Url

async function generateCsrf() {
	const csrfBytes = crypto.getRandomValues(new Uint8Array(32))
	const csrfKey = await getCsrfKey()
	const csrfSignature = await crypto.subtle.sign('HMAC', csrfKey, csrfBytes)
	return [
		arrayToBase64url(csrfBytes),
		arrayToBase64url(new Uint8Array(csrfSignature)),
	] as const satisfies [CsrfFormat, CsrfFormat]
}

export async function isInvalidCsrf(
	csrfSignature: CsrfFormat,
	csrf: CsrfFormat,
) {
	const csrfKey = await getCsrfKey()
	const signature = base64urlToArray(csrfSignature)
	const data = base64urlToArray(csrf)
	const isValid = await crypto.subtle.verify('HMAC', csrfKey, signature, data)
	return !isValid
}
