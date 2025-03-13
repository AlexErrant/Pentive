import * as fs from 'fs'
import { hstsName, hstsValue } from 'shared/headers'

const contents = `/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: cross-origin
  Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';
  ${hstsName}: ${hstsValue}

/hubmessenger
  ! Content-Security-Policy
  Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors ${process.env.VITE_HUB_ORIGIN};
`

fs.writeFile('./dist/_headers', contents, (err) => {
	if (err != null) {
		console.error(err)
	}
})
