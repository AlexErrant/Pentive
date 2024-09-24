import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense } from 'solid-js'
import './app.css'
import Nav from './components/nav'
import { ThemeProvider } from 'shared-dom/themeSelector'

export default function App() {
	return (
		<ThemeProvider>
			<Router
				root={(props) => (
					<Suspense fallback={<div class='news-list-nav'>Loading...</div>}>
						<Nav />
						{props.children}
					</Suspense>
				)}
			>
				<FileRoutes />
			</Router>
		</ThemeProvider>
	)
}
