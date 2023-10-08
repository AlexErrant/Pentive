import { freeze } from 'immer'
import { blobToBase64, type Plugin } from 'shared-dom'
import {
	defaultContainer,
	type Container,
	type PluginExports,
} from './services'
import { db } from './db'
import { createResource } from 'solid-js'

async function registerPluginService(
	c: Container,
	plugin: Plugin,
): Promise<Container> {
	const script = await blobToBase64(plugin.script)
	// A limitation of this import is that it won't resolve other files in the npmPackage.tgz
	// Does addressing this even make sense? How could one resolve relative file imports anyway?
	// Also, the Plugin table currently only stores a single `script` per Plugin. If we add support for more than 1 file,
	// we should consider storing the npmPackage.tgz in sqlite. However, generating npmPackage.tgz for tests (cardHtml.plugin.test.ts)
	// is *extremely* annoying, because we use DecompressionStream which only works in browsers,
	// and jsdom doesn't support streams https://github.com/jsdom/jsdom/pull/3200
	// grep 2D96EE4E-61BA-4FCA-93C1-863C80E10A93
	const exports = (await import(/* @vite-ignore */ script)) as {
		default: PluginExports
	}
	return getC(c, exports.default)
}

function getC(c: Container, exports: PluginExports): Container {
	if (exports.services === undefined) return c
	const rExports = exports.services(freeze(c, true))
	return {
		...c,
		...rExports,
	}
}

export async function registerPluginServices(plugins: Plugin[]) {
	const seed = defaultContainer
	return await plugins.reduce(async (prior, plugin) => {
		return await registerPluginService(await prior, plugin)
	}, Promise.resolve(seed))
}

export async function aC() {
	// const start = performance.now()
	const plugins = await db.getPlugins()
	const r = await registerPluginServices(plugins)
	// const end = performance.now()
	// console.log(`plugins took ${end - start} ms`) // takes ~200ms with an empty container - mostly due to initializing the database
	return r
}

// medTODO consider using a 'custom reconciling store' to make plugin loading fine-grained https://docs.solidjs.com/references/api-reference/basic-reactivity/createResource
export const C = createResource(aC, { initialValue: defaultContainer })[0]
