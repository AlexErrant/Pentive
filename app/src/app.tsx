import { type JSX, createEffect } from 'solid-js'
import { Router } from '@solidjs/router'
import { navLinks, routes } from './routes'
import { C, theme } from './topLevelAwait'
import { Toaster } from 'solid-toast'
import 'golden-layout/dist/css/goldenlayout-base.css'

export default function App(): JSX.Element {
	createEffect(() => {
		if (theme() === 'light') {
			import('golden-layout/dist/css/themes/goldenlayout-light-theme.css')
		} else {
			import('golden-layout/dist/css/themes/goldenlayout-dark-theme.css')
		}
	})

	return (
		<Router
			root={(props) => (
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

					<main class='contents'>{props.children}</main>
					<Toaster />
				</>
			)}
		>
			{routes}
		</Router>
	)
}
