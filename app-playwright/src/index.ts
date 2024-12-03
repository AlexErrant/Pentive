import type { Container, PluginExports } from 'app/services'
import TestDb from './testdb'
import { reasonableDates } from './arbitrary'
import fc from 'fast-check'

const services = (c: Container): Partial<Container> => {
	const date = fc.sample(reasonableDates, 1)[0]!
	console.log('Date set to', date)
	return {
		routes: c.routes.concat({
			path: '/testdb',
			component: () => TestDb(c.db, date), // lowTODO make this lazy loaded - grep 2D96EE4E-61BA-4FCA-93C1-863C80E10A93
		}),
		getDate: () => date,
	}
}

const exports: PluginExports = {
	services,
}

export default exports
