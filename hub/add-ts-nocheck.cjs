/*
Fix for "tsc --noEmit" issue:
https://github.com/solidjs/solid-start/issues/255
*/

const fs = require('fs')
const path = require('path')

// https://stackoverflow.com/a/55566081
const readdirSync = (p, a = []) => {
	if (fs.statSync(p).isDirectory())
		fs.readdirSync(p).map((f) => readdirSync(a[a.push(path.join(p, f)) - 1], a))
	return a
}

const ADDED_STR = '// @ts-nocheck\n\n'
const FILES = readdirSync('node_modules/solid-start').filter(
	(f) => f.endsWith('.ts') || f.endsWith('.tsx'),
)

Promise.allSettled(FILES.map(addTsNoCheck)).then((results) => {
	let hasErrors = false

	for (const result of results) {
		if (result.status === 'rejected') {
			hasErrors = true
			console.error(result.reason)
		}
	}

	if (hasErrors) {
		process.exit(1)
	}
})

async function addTsNoCheck(file) {
	const content = fs.readFileSync(file).toString()

	if (content.includes(ADDED_STR)) {
		console.log(JSON.stringify(ADDED_STR), 'is already in', file)
	} else {
		fs.writeFileSync(file, ADDED_STR + content)
		console.log(JSON.stringify(ADDED_STR), 'added into', file)
	}
}

const ADDED_STR_TYPE =
	'import type * as StartServerTypes from "../entry-server/StartServer";\n\n'
const FILES_TYPE = ['node_modules/solid-start/server/render.ts']

Promise.allSettled(FILES_TYPE.map(addTypeImport)).then((results) => {
	let hasErrors = false

	for (const result of results) {
		if (result.status === 'rejected') {
			hasErrors = true
			console.error(result.reason)
		}
	}

	if (hasErrors) {
		process.exit(1)
	}
})

async function addTypeImport(file) {
	const content = fs.readFileSync(file).toString()

	if (content.includes(ADDED_STR_TYPE)) {
		console.log(JSON.stringify(ADDED_STR_TYPE), 'is already in', file)
	} else {
		fs.writeFileSync(file, ADDED_STR_TYPE + content)
		console.log(JSON.stringify(ADDED_STR_TYPE), 'added into', file)
	}
}
