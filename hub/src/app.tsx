import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense } from 'solid-js'
import './app.css'
import Nav from './components/nav'
import { ThemeProvider } from 'shared-dom/themeSelector'
import { UserIdProvider } from './components/userIdContext'

export default function App() {
	return (
		<UserIdProvider>
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
		</UserIdProvider>
	)
}
