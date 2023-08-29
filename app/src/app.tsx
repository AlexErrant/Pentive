import type { JSX } from 'solid-js'
import { useRoutes } from '@solidjs/router'

import { navLinks, routes } from './routes'
import { C } from './pluginManager'

export default function App(): JSX.Element {
	const Route = useRoutes(routes)

	return (
		<>
			{/* this iframe exists to make ensure app-ugc's service worker is cached, so that app may be taken offline at any time */}
			<iframe
				hidden
				style={{
					width: '0',
					height: '0',
					border: 'none',
					position: 'absolute',
				}}
				src={import.meta.env.VITE_APP_UGC_ORIGIN}
			/>
			<C.nav navLinks={navLinks} />

			<main class='contents'>
				<Route />
			</main>
		</>
	)
}
