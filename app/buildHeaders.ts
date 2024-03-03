import { hstsName, hstsValue } from 'shared'
import * as fs from 'fs'

const contents = `/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  ${hstsName}: ${hstsValue}`

fs.writeFile('./dist/_headers', contents, (err) => {
	if (err != null) {
		console.error(err)
	}
})
