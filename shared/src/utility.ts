import { base64urlToArray, idToEpoch } from './binary.js'
import type { Base64Url, DbId } from './brand'

// https://stackoverflow.com/a/69328045
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

export type SqliteCount = number

// https://stackoverflow.com/a/57683652
export type Rasterize<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

// https://basarat.gitbook.io/typescript/type-system/discriminated-unions#throw-in-exhaustive-checks
export function assertNever(x: never, msg?: string): never {
	if (msg != null) {
		throw new Error(msg)
	}
	throw new Error(
		`Expected 'never', but got an unexpected value:
${JSON.stringify(x)}`,
	)
}

export function undefinedMap<T, R>(
	t: T | undefined,
	f: (_: T) => R,
): R | undefined {
	if (t === undefined) {
		return t as undefined
	}
	return f(t)
}

export function nullMap<T, R>(t: T | null, f: (_: T) => R): R | null {
	if (t === null) {
		return t as null
	}
	return f(t)
}

// https://stackoverflow.com/a/65666402
// If you update this function, also update `./utility.workerd.ts`!
export function throwExp(error?: unknown, ...metadata: unknown[]): never {
	console.error('`throwExp` hit!')
	// eslint-disable-next-line no-debugger
	debugger
	if (error == null) {
		console.trace()
		throw new Error(
			'This error should never occur - please open an issue if you see this!',
		)
	}
	if (metadata.length !== 0) console.error(...metadata)
	if (typeof error === 'string') {
		throw new Error(error)
	}
	throw error as unknown
}

// https://stackoverflow.com/a/46700791/
export function notEmpty<TValue>(
	value: TValue | null | undefined,
): value is TValue {
	return value !== null && value !== undefined
}

// highTODO property test
export function stringifyMap(map: Map<unknown, unknown>) {
	return JSON.stringify(Object.fromEntries(map))
}

export function parseMap<T extends string, U>(rawMap: string) {
	const parsed = JSON.parse(rawMap) as Record<T, U>
	const entries = Object.entries(parsed) as Array<[T, U]>
	return new Map(entries)
}

// highTODO property test
export function stringifySet(set: Set<unknown> | ReadonlySet<unknown>) {
	return JSON.stringify([...set])
}

export function parseSet<T>(rawSet: string) {
	const parsed = JSON.parse(rawSet) as T[]
	return new Set(parsed)
}

// https://stackoverflow.com/questions/51599481/replacing-property-of-a-typescript-type#comment134810492_72983690
export type Override<
	T,
	U extends Partial<Record<keyof T, unknown>>,
> = Rasterize<Omit<T, keyof U> & U>

export const objKeys: <TKey extends string, TVal>(
	o: Record<TKey, TVal>,
) => TKey[] = Object.keys

export const objValues: <TKey extends string, TVal>(
	o: Record<TKey, TVal>,
) => TVal[] = Object.values

export const objEntries: <TKey extends string, TVal>(
	o: Record<TKey, TVal>,
) => Array<[TKey, TVal]> = Object.entries

// https://stackoverflow.com/a/6969486
export function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export const dayInMs = 86_400_000

// https://gist.github.com/72lions/4528834
export function concat(
	a1: Uint8Array<ArrayBuffer>,
	a2: ArrayBuffer,
): Uint8Array<ArrayBuffer> {
	const tmp = new Uint8Array(a1.byteLength + a2.byteLength)
	tmp.set(a1, 0)
	tmp.set(new Uint8Array(a2), a1.byteLength)
	return tmp
}
export function concatAB(
	a1: ArrayBuffer,
	a2: ArrayBuffer,
): Uint8Array<ArrayBuffer> {
	const tmp = new Uint8Array(a1.byteLength + a2.byteLength)
	tmp.set(new Uint8Array(a1), 0)
	tmp.set(new Uint8Array(a2), a1.byteLength)
	return tmp
}

export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms))
}

const timeoutSymbol = Symbol()

// https://stackoverflow.com/a/67630893
async function retry<T>(f: () => Promise<T>, count: number) {
	for (let attempt = 1; attempt <= count; attempt++) {
		try {
			return await f()
		} catch (err) {
			if (
				typeof err === 'object' &&
				err != null &&
				'cause' in err &&
				err.cause === timeoutSymbol
			) {
				console.debug(`Retry ${attempt}/${count}`)
			}
		}
	}
	throw Error(`Failed after ${count} tries`)
}
async function timeout<T>(f: () => Promise<T>, ms: number) {
	return await Promise.race([
		f(),
		sleep(ms).then(() => {
			throw Error(undefined, { cause: timeoutSymbol })
		}),
	])
}
export async function retryWithTimeout<T>(
	f: () => Promise<T>,
	count: number,
	timeoutMs: number,
) {
	return await retry(async () => await timeout(f, timeoutMs), count)
}

export function epochToDate(epoch: number) {
	return new Date(epoch * 1000)
}
export function idToDate(id: Base64Url) {
	return new Date(idToEpoch(base64urlToArray(id)))
}
export function rawIdToDate(id: DbId) {
	return new Date(idToEpoch(id))
}
export function dateToEpoch(date: Date) {
	return date.getTime() / 1000
}
export function maybeDateToEpoch(date: Date | null | undefined) {
	if (date == null) return null
	return dateToEpoch(date)
}
export function maybeEpochToDate(epoch: number | null | undefined) {
	if (epoch == null) return null
	return epochToDate(epoch)
}
