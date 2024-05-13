import { hstsName, hstsValue } from 'shared'
import { setKysely } from 'shared-edge'
import {
	createHandler,
	renderAsync,
	StartServer,
} from 'solid-start/entry-server'
import { setSessionStorage } from './session'

export default createHandler(
	renderAsync((event) => {
		setKysely(event.env.planetscaleDbUrl)
		setSessionStorage({
			hubSessionSecret: event.env.hubSessionSecret,
			csrfSecret: event.env.csrfSecret,
			hubInfoSecret: event.env.hubInfoSecret,
			oauthStateSecret: event.env.oauthStateSecret,
			oauthCodeVerifierSecret: event.env.oauthCodeVerifierSecret,
		})
		event.responseHeaders.set(hstsName, hstsValue)
		return <StartServer event={event} />
	}),
)
