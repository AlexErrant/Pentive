import { freeze } from 'immer'
import type { Plugin } from './plugin'
import {
	type RenderContainerArgs,
	defaultRenderContainer,
	type RenderContainer,
	type RenderPluginExports,
} from './renderContainer'

// https://stackoverflow.com/a/18650249
export async function blobToBase64(blob: Blob): Promise<string> {
	return await new Promise((resolve) => {
		const reader = new FileReader()
		reader.onloadend = () => {
			resolve(reader.result as string)
		}
		// The `data:text/javascript;base64,` on the return value of from `readAsDataURL` is used by this function's callers https://stackoverflow.com/a/57255653
		reader.readAsDataURL(blob) // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
	})
}

async function registerPluginService(
	c: RenderContainer,
	plugin: Plugin,
): Promise<RenderContainer> {
	const script = await blobToBase64(plugin.script)
	// grep 2D96EE4E-61BA-4FCA-93C1-863C80E10A93
	const exports = (await import(/* @vite-ignore */ script)) as {
		default: RenderPluginExports
	}
	return getC(c, exports.default)
}

function getC(
	c: RenderContainer,
	exports: RenderPluginExports,
): RenderContainer {
	if (exports.services === undefined) return c
	const rExports = exports.services(freeze(c, true))
	return {
		...c,
		...rExports,
	}
}

export async function registerPluginServices(
	plugins: Plugin[],
	args: RenderContainerArgs,
): Promise<RenderContainer> {
	const seed: RenderContainer = defaultRenderContainer(args)
	const c = await plugins.reduce(async (prior, plugin) => {
		return await registerPluginService(await prior, plugin)
	}, Promise.resolve(seed))
	return c
}
