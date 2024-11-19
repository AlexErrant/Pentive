// this preview doesn't actually work; lowTODO fix

import { render } from 'solid-js/web'
import { defaultContainer } from 'app/services'
import TestDb from './testdb'

render(() => {
	return (
		<>
			{TestDb(
				defaultContainer({
					// @ts-expect-error resizingIframe isn't used
					resizingIframe: null,
				}).db,
			)}
		</>
	)
}, document.getElementById('root')!)
