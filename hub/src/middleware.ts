import { createMiddleware } from '@solidjs/start/middleware'
import { setKysely } from 'shared-edge'
import { env } from './session'
import { hstsName, hstsValue } from 'shared'

export default createMiddleware({
	onRequest: [
		(event) => {
			const { tursoDbUrl, tursoAuthToken } = env(event)
			setKysely(tursoDbUrl, tursoAuthToken)
		},
	],
	onBeforeResponse: [
		(event) => {
			event.response.headers.set(hstsName, hstsValue)
		},
	],
})
