import { createMiddleware } from '@solidjs/start/middleware'
import { setKysely } from 'shared-edge'
import { env } from './session'

export default createMiddleware({
	onRequest: [
		(event) => {
			const { tursoDbUrl, tursoAuthToken } = env(event)
			setKysely(tursoDbUrl, tursoAuthToken)
		},
	],
})
