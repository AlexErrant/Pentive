import './index.css'
import { render } from 'solid-js/web'
import App from './app'
import { C } from './topLevelAwait'

render(() => <App />, document.getElementById('root') as HTMLElement)

import('./registerServiceWorker').catch((e) => {
	C.toastError('Error registering service worker.', e)
})
