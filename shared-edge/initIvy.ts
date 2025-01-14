import * as fs from 'fs'
import { createClient } from '@libsql/client'
import { Kysely } from 'kysely'
import { LibsqlDialect } from '@libsql/kysely-libsql'
import { type DB } from './src/dbSchema'
import { type MediaHash, type DbId } from 'shared/brand'

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

// eslint-disable-next-line no-constant-condition
if (false) {
	for (const sql of ivySchemaSplit) {
		console.log('sql', sql.sql)
		const r = await client.execute(sql)
		console.log(JSON.stringify(r, null, 4))
	}
}

if (tableCount === 0) {
	const result = await client.batch(ivySchemaSplit, 'write')
	console.log(JSON.stringify(result, null, 4))
}

// Kysely Playground

// eslint-disable-next-line no-constant-condition
if (false) {
	const db = new Kysely<DB>({
		dialect: new LibsqlDialect({
			client,
		}),
	})

	const mediaHash = crypto.getRandomValues(new Uint8Array(8))
		.buffer as MediaHash
	const entityId = crypto.getRandomValues(new Uint8Array(8)).buffer as DbId
	console.log('mediaHash', mediaHash)
	console.log('entityId', entityId)

	const inserted = await db
		.insertInto('media_Entity')
		.values({ mediaHash, i: 13, entityId })
		.execute()
	console.log('inserted', inserted)

	const queried = await db
		.selectFrom('media_Entity')
		.where('mediaHash', '=', mediaHash)
		.selectAll()
		.execute()
	console.log('queried', queried)
}
