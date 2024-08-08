import * as fs from 'fs'
import { createClient } from '@libsql/client'

const ivySchema = fs.readFileSync('./ivySchema.sql').toString()
const ivySchemaSplit = ivySchema
	.split(';')
	.map((x) => x.trim())
	.filter((x) => x !== '')
	.map((x) => x + ';')
	.map((x) => ({ sql: x, args: [] }))

const client = createClient({
	// url: process.env.productionTursoDbUrl!,
	// authToken: process.env.productionTursoAuthToken,
	url: process.env.developmentTursoDbUrl!,
	authToken: process.env.developmentTursoAuthToken,
})

const tableCount = await client
	.execute(`SELECT count(*) FROM sqlite_master WHERE type = 'table'`)
	.then((x) => x.rows[0][0] as number)

if (tableCount === 0) {
	const result = await client.batch(ivySchemaSplit, 'write')
	console.log(JSON.stringify(result, null, 4))
}
