import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense } from 'solid-js'
import './app.css'
import Nav from './components/nav'
import { ThemeProvider } from 'shared-dom/themeSelector'
import { UserIdProvider } from './components/userIdContext'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5000,
		},
	},
})

export default function App() {
	return (
		<UserIdProvider>
			<ThemeProvider>
				<QueryClientProvider client={queryClient}>
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
					<SolidQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
			</ThemeProvider>
		</UserIdProvider>
	)
}
