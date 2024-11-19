import type { Container, PluginExports } from 'app/services'
import TestDb from './testdb'

const services = (c: Container): Partial<Container> => {
	return {
		routes: c.routes.concat({
			path: '/testdb',
			component: () => TestDb(c.db), // lowTODO consider how to make this lazy loaded
		}),
	}
}

const exports: PluginExports = {
	services,
}

export default exports
