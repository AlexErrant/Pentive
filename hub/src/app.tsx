import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense } from 'solid-js'
import './app.css'
import Nav from './components/nav'
import { ThemeProvider } from 'shared-dom/themeSelector'
import { UserIdProvider } from './components/userIdContext'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools'
import { isServer } from 'solid-js/web'
import { clientOnly } from '@solidjs/start'

const Toaster = clientOnly(async () => {
	const { Toaster } = await import('solid-toast')
	return { default: Toaster }
})

export default function App() {
	// do not lift out https://github.com/TanStack/query/blob/18e357c2973f13723f71a0c7a623e99d9fcdb00c/docs/framework/react/guides/ssr.md?plain=1#L55-L60
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5000,
				refetchOnMount: () => !isServer, // don't refetch on the server
			},
		},
	})
	return (
		<UserIdProvider>
			<ThemeProvider>
				<QueryClientProvider client={queryClient}>
					<Router
						root={(props) => (
							<Suspense fallback={<div class='news-list-nav'>Loading...</div>}>
								<Nav />
								{props.children}
								<Toaster />
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
