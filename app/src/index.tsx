import './index.css'
import { render } from 'solid-js/web'
import App from './app'
import { C } from './topLevelAwait'
import { ThemeProvider } from 'shared-dom/themeSelector'
import { DiffModeProvider } from './components/diffModeContext'
import { WhoAmIProvider } from './components/whoAmIContext'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { TableCountProvider } from './components/tableCountContext'
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools'

const client = new QueryClient({
	defaultOptions: {
		queries: { throwOnError: true },
		mutations: {
			onError(error) {
				C.toastError(error.message, error)
			},
		},
	},
})

render(
	() => (
		<QueryClientProvider client={client}>
			<WhoAmIProvider>
				<DiffModeProvider>
					<ThemeProvider>
						<TableCountProvider>
							<App />
						</TableCountProvider>
					</ThemeProvider>
				</DiffModeProvider>
			</WhoAmIProvider>
			<SolidQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	),
	document.getElementById('root')!,
)

import('./registerServiceWorker').catch((e: unknown) => {
	C.toastError('Error registering service worker.', e)
})
