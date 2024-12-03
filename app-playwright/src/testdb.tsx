import { type JSX } from 'solid-js/jsx-runtime'
import { isEqual } from 'lodash-es'
import { createResource, Match, Switch } from 'solid-js'
import fc from 'fast-check'
import { template as arbitraryTemplate } from './arbitraryTemplate'
import { card as arbitraryCard } from './arbitraryCard'
import { note as arbitraryNote } from './arbitraryNote'
import type { Container } from 'app/services'

const numRuns = 10 // getting database corruption if we use larger numbers. lowTODO fix by upgrading
const endOnFailure = true // no shrinking since it makes the db corruption worse

type Db = Container['db']

function customStringify(obj: unknown) {
	return JSON.stringify(obj, (_key, value) => {
		if (value instanceof Map) {
			return {
				type: 'Map',
				value: Array.from(value.entries()),
			}
		}
		if (value instanceof Set) {
			return {
				type: 'Set',
				value: Array.from(value),
			}
		}
		if (value instanceof Date) {
			return {
				type: 'Date',
				value: value.toISOString(),
			}
		}
		if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
			const v = value as Record<string, unknown>
			return Object.keys(v)
				.sort()
				.reduce<Record<string, unknown>>((sortedObj, key) => {
					sortedObj[key] = v[key]
					return sortedObj
				}, {})
		}
		return value as unknown
	})
}

function log<T>(equal: boolean, expected: T, actual: T) {
	if (!equal) {
		// eslint-disable-next-line no-debugger
		debugger
		customStringify({ expected, actual })
		console.log({
			expected: fc.stringify(expected),
			actual: fc.stringify(actual),
		})
	}
}

async function testTemplate(db: Db, date: Date) {
	await fc.assert(
		fc.asyncProperty(arbitraryTemplate, async (expected) => {
			expected.created = date
			expected.edited = date
			await db.upsertTemplate(expected)
			const actual = await db.getTemplate(expected.id)
			const r = isEqual(expected, actual)
			log(r, expected, actual)
			return r
		}),
		{ verbose: true, numRuns, endOnFailure },
	)
	return true
}

async function testNote(db: Db, date: Date) {
	const templates = await db.getTemplates()
	await fc.assert(
		fc.asyncProperty(
			fc.constantFrom(...templates).chain(arbitraryNote),
			async (expected) => {
				expected.created = date
				expected.edited = date
				await db.upsertNote(expected)
				const actual = await db.getNote(expected.id)
				const r = isEqual(expected, actual)
				log(r, expected, actual)
				return r
			},
		),
		{ verbose: true, numRuns, endOnFailure },
	)
	return true
}

async function testCard(db: Db, date: Date) {
	await fc.assert(
		fc.asyncProperty(arbitraryCard, async (expected) => {
			expected.created = date
			expected.edited = date
			await db.upsertCard(expected)
			const actual = await db.getCard(expected.id)
			const r = isEqual(expected, actual)
			log(r, expected, actual)
			return r
		}),
		{ verbose: true, numRuns, endOnFailure },
	)
	return true
}

export default function TestDb(db: Db, date: Date): JSX.Element {
	const [testsResult] = createResource(async () => {
		const template = await testTemplate(db, date)
		const note = await testNote(db, date)
		const card = await testCard(db, date)
		const statuses = [template, note, card]
		if (statuses.some((a) => a === undefined)) {
			return undefined
		}
		return statuses.every((element) => element)
	})
	return (
		<section class='text-gray-700 p-8'>
			<h1 class='text-2xl font-bold'>Test IndexedDB</h1>
			<p class='mt-4'>
				This page exists to be the target of automated Playwright testing.
			</p>
			<p class='mt-4'>It has no functionality relevant to users.</p>
			<p class='mt-4'>
				It isn't great that users can view it, but I'm on a time crunch.
			</p>
			<Switch fallback={<p>Loading...</p>}>
				<Match when={testsResult() === true}>
					<p id='testStatus'>✔ Passed!</p>
				</Match>
				<Match when={testsResult() === false}>
					<p id='testStatus'>❌ failed!</p>
				</Match>
			</Switch>
		</section>
	)
}
