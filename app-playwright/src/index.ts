import type { Container, PluginExports } from 'app/services'
import TestDb from './testdb'

const services = (c: Container): Partial<Container> => {
	return {
		routes: c.routes.concat({
			path: '/testdb',
			component: () => TestDb(c.db), // lowTODO make this lazy loaded - grep 2D96EE4E-61BA-4FCA-93C1-863C80E10A93
		}),
	}
}

const exports: PluginExports = {
	services,
}

export default exports
