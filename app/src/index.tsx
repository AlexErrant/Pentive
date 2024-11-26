import './index.css'
import { render } from 'solid-js/web'
import App from './app'
import { C } from './topLevelAwait'
import { ThemeProvider } from 'shared-dom/themeSelector'
import { DiffModeProvider } from './components/diffModeContext'
import { WhoAmIProvider } from './components/whoAmIContext'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { TemplatesTableProvider } from './components/templatesTableContext'

const client = new QueryClient()

render(
	() => (
		<QueryClientProvider client={client}>
			<WhoAmIProvider>
				<DiffModeProvider>
					<ThemeProvider>
						<TemplatesTableProvider>
							<App />
						</TemplatesTableProvider>
					</ThemeProvider>
				</DiffModeProvider>
			</WhoAmIProvider>
		</QueryClientProvider>
	),
	document.getElementById('root') as HTMLElement,
)

import('./registerServiceWorker').catch((e) => {
	C.toastError('Error registering service worker.', e)
})
