// @refresh reload
// import { hstsName, hstsValue } from 'shared'
// import { setKysely } from 'shared-edge'
import { createHandler, StartServer } from '@solidjs/start/server'
// import { setSessionStorage } from './session'

export default createHandler(() => {
	// nextTODO
	// setKysely(event.env.planetscaleDbUrl)
	// setSessionStorage({
	// 	hubSessionSecret: event.env.hubSessionSecret,
	// 	csrfSecret: event.env.csrfSecret,
	// 	hubInfoSecret: event.env.hubInfoSecret,
	// 	oauthStateSecret: event.env.oauthStateSecret,
	// 	oauthCodeVerifierSecret: event.env.oauthCodeVerifierSecret,
	// })
	// event.responseHeaders.set(hstsName, hstsValue)
	return (
		<StartServer
			document={({ assets, children, scripts }) => (
				<html lang='en'>
					<head>
						<meta charset='utf-8' />
						<meta
							name='viewport'
							content='width=device-width, initial-scale=1'
						/>
						<link rel='icon' href='/favicon.ico' />
						{assets}
					</head>
					<body>
						<div id='app'>{children}</div>
						{scripts}
					</body>
				</html>
			)}
		/>
	)
})
