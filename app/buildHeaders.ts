import { hstsName, hstsValue } from 'shared'
import * as fs from 'fs'

const contents = `/*
  ${hstsName}: ${hstsValue}`

fs.writeFile('./dist/_headers', contents, (err) => {
	if (err != null) {
		console.error(err)
	}
})
