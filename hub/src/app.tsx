import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { ErrorBoundary, Suspense } from 'solid-js'
import './app.css'
import Nav from './components/nav'

export default function App() {
	return (
		<Router
			root={(props) => (
				<ErrorBoundary
					fallback={(err) => <div>Error: {JSON.stringify(err)}</div>}
				>
					<Suspense fallback={<div class='news-list-nav'>Loading...</div>}>
						<Nav />
						{props.children}
					</Suspense>
				</ErrorBoundary>
			)}
		>
			<FileRoutes />
		</Router>
	)
}
