import { type JSX, createEffect } from 'solid-js'
import { Router } from '@solidjs/router'
import { navLinks } from './routes'
import { C } from './topLevelAwait'
import { Toaster } from 'solid-toast'
import 'golden-layout/dist/css/goldenlayout-base.css'
import { useThemeContext } from 'shared-dom/themeSelector'

export default function App(): JSX.Element {
	const [theme] = useThemeContext()
	createEffect(() => {
		if (theme() === 'light') {
			void import('golden-layout/dist/css/themes/goldenlayout-light-theme.css')
		} else {
			void import('golden-layout/dist/css/themes/goldenlayout-dark-theme.css')
		}
	})

	return (
		<Router
			root={(props) => (
				<>
					{/* This iframe exists to make ensure app-ugc's service worker is cached, so that app may be taken offline at any time. */}
					{/* It is null in `test` mode because Playwright's Firefox can't handle it for some reason. */}
					{import.meta.env.MODE === 'test' ? null : (
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
					)}
					<C.nav navLinks={navLinks} />

					<main class='contents'>{props.children}</main>
					<Toaster />
				</>
			)}
		>
			{C.routes}
		</Router>
	)
}
