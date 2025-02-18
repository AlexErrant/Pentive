import * as fs from 'fs'
import { hstsName, hstsValue } from 'shared/headers'

const contents = `/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: cross-origin
  ${hstsName}: ${hstsValue}`

fs.writeFile('./dist/_headers', contents, (err) => {
	if (err != null) {
		console.error(err)
	}
})
