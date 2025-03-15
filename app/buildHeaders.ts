import * as fs from 'fs'
import * as crypto from 'crypto'
import { hstsName, hstsValue } from 'shared/headers'
import { throwExp } from 'shared/utility'

function getScriptHashes(filePath: string) {
	const html = fs.readFileSync(filePath, 'utf8')
	const hashes = [...html.matchAll(/<script\b.*?>(.+?)<\/script>/gis)]
		.map(([, scriptContent]) =>
			crypto
				.createHash('sha256')
				.update(scriptContent!, 'utf8')
				.digest('base64'),
		)
		.map((hash) => `'sha256-${hash}'`)
	return hashes.join(' ')
}

const indexHashStr = getScriptHashes('./dist/index.html')
const hubmessengerHashStr = getScriptHashes('./dist/hubmessenger.html')

function buildCsp(directives: Record<string, string | string[]>) {
	return Object.entries(directives)
		.map(
			([directive, value]) =>
				`${directive} ${Array.isArray(value) ? value.join(' ') : value}`,
		)
		.join(';')
}

const base = {
	'default-src': "'self'",
	'font-src': 'data:', // https://www.ag-grid.com/javascript-data-grid/security/#font-src
	'img-src': ["'self'", 'data:'], // https://www.ag-grid.com/javascript-data-grid/security/#img-src
	'style-src': ["'self'", "'unsafe-inline'"], // https://www.ag-grid.com/javascript-data-grid/security/#style-src
}

const mainDirectives = {
	...base,
	'frame-ancestors': "'none'",
	'script-src': ["'self'", indexHashStr, "'wasm-unsafe-eval'"],
	'script-src-elem': [
		"'self'",
		indexHashStr,
		'https://static.cloudflareinsights.com',
	],
	'connect-src': ["'self'", process.env.VITE_CWA_URL ?? throwExp()],
	'frame-src': process.env.VITE_APP_UGC_ORIGIN ?? throwExp(),
}

const hubmessengerDirectives = {
	...base,
	'frame-ancestors': process.env.VITE_HUB_ORIGIN ?? throwExp(),
	'script-src': ["'self'", hubmessengerHashStr, "'wasm-unsafe-eval'"],
	'script-src-elem': [
		"'self'",
		hubmessengerHashStr,
		'https://static.cloudflareinsights.com',
	],
}

const contents = `/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: cross-origin
  Content-Security-Policy: ${buildCsp(mainDirectives)}
	${hstsName}: ${hstsValue}

/hubmessenger
  ! Content-Security-Policy
  Content-Security-Policy: ${buildCsp(hubmessengerDirectives)}`

fs.writeFile('./dist/_headers', contents, (err) => {
	if (err != null) {
		console.error(err)
	}
})
