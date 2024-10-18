import { createMiddleware } from '@solidjs/start/middleware'
import { setKysely } from 'shared-edge'
import { env } from './session'
import { hstsName, hstsValue } from 'shared/headers'

export default createMiddleware({
	onRequest: [
		(event) => {
			const { tursoDbUrl, tursoAuthToken } = env(event)
			setKysely(tursoDbUrl, tursoAuthToken)
		},
	],
	onBeforeResponse: [
		(event) => {
			// https://securityheaders.com/
			event.response.headers.set(hstsName, hstsValue)
			event.response.headers.set('X-Frame-Options', 'DENY')
			event.response.headers.set('X-Content-Type-Options', 'nosniff')
			event.response.headers.set(
				'Referrer-Policy',
				'strict-origin-when-cross-origin',
			) // can't be `no-referrer` due to single-flight-mutations
			// event.response.headers.set('Permissions-Policy', '') // ignored because denying everything adds a bunch of noise to the header for something the browser already prompts the user for
			// https://owasp.org/www-project-secure-headers/
			event.response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
			event.response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
			event.response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
			event.response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
			if (event.response.headers.get('Content-Security-Policy') == null) {
				// `entry-server.tsx` must contain a `Content-Security-Policy` because it's where Solid Start expects `nonce`.
				// However, a CSP may be useful on API responses, so we do that here if no CSP is detected.
				// https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
				event.response.headers.set(
					'Content-Security-Policy',
					`default-src 'none';frame-ancestors 'none'`,
				)
			}
		},
	],
})
