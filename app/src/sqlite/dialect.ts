// literal copy/paste of https://github.com/Azarattum/CRStore/blob/main/src/lib/database/dialect.ts

/* eslint-disable require-yield */
/* eslint-disable @typescript-eslint/require-await */
import {
	SqliteDialect,
	CompiledQuery,
	type DatabaseConnection,
	type SqliteDialectConfig,
} from 'kysely'

class CRDialect extends SqliteDialect {
	database: () => Promise<CRDatabase>

	constructor(config: CRDialectConfig) {
		super(config as unknown as SqliteDialectConfig)
		this.database = async () =>
			typeof config.database === 'function'
				? await config.database()
				: config.database
	}

	createDriver() {
		const load = this.database
		const waiter = mutex()

		let db: CRDatabase
		let connection: DatabaseConnection

		return {
			async init() {
				db = await load()
				connection = {
					async executeQuery<O>(query: CompiledQuery) {
						return {
							rows: (await db.execO(query.sql, query.parameters)) as O[],
						}
					},
					async *streamQuery() {
						throw new Error("Sqlite driver doesn't support streaming")
					},
				}
			},
			async acquireConnection() {
				await waiter.lock()
				return connection
			},
			async beginTransaction(connection: DatabaseConnection) {
				await connection.executeQuery(CompiledQuery.raw('begin'))
			},
			async commitTransaction(connection: DatabaseConnection) {
				await connection.executeQuery(CompiledQuery.raw('commit'))
			},
			async rollbackTransaction(connection: DatabaseConnection) {
				await connection.executeQuery(CompiledQuery.raw('rollback'))
			},
			async releaseConnection() {
				waiter.unlock()
			},
			async destroy() {
				db.close()
			},
		}
	}
}

function mutex() {
	let promise: Promise<void> | undefined
	let resolve: (() => void) | undefined

	return {
		async lock() {
			while (promise != null) await promise
			promise = new Promise((r) => (resolve = r))
		},
		unlock(): void {
			const unlock = resolve
			promise = undefined
			resolve = undefined
			unlock?.()
		},
	}
}

interface CRDialectConfig {
	database: CRDatabase | (() => Promise<CRDatabase>)
}

interface CRDatabase {
	close: () => void
	execO: <T extends Record<string, unknown>>(
		sql: string,
		bind?: readonly unknown[],
	) => Promise<T[]>
}

export { CRDialect, type CRDatabase }
