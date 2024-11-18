import './index.css'
import { render } from 'solid-js/web'
import App from './app'
import { C } from './topLevelAwait'
import { ThemeProvider } from 'shared-dom/themeSelector'
import { DiffModeProvider } from './components/diffModeContext'
import { ContainerProvider } from './components/containerContext'

render(
	() => (
		<ContainerProvider>
			<DiffModeProvider>
				<ThemeProvider>
					<App />
				</ThemeProvider>
			</DiffModeProvider>
		</ContainerProvider>
	),
	document.getElementById('root') as HTMLElement,
)

import('./registerServiceWorker').catch((e) => {
	C.toastError('Error registering service worker.', e)
})
