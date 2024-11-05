import { freeze } from 'immer'
import { type Plugin } from 'shared-dom/plugin'
import { blobToBase64 } from 'shared-dom/pluginManager'
import {
	defaultContainer,
	type Container,
	type PluginExports,
} from './services'
import ResizingIframe from './components/resizingIframe'

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
	// Cloudflare's Wrangler discusses a similar issue https://developers.cloudflare.com/workers/wrangler/bundling/
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
	const seed = defaultContainer({ resizingIframe: ResizingIframe })
	const urlParams = new URLSearchParams(window.location.search)
	if (urlParams.get('plugins') === 'none') {
		seed.toastInfo('Loading without plugins.')
		return seed
	}
	return await plugins.reduce(async (prior, plugin) => {
		return await registerPluginService(await prior, plugin)
	}, Promise.resolve(seed))
}
