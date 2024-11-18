import { type JSX } from 'solid-js/jsx-runtime'
import { isEqual } from 'lodash-es'
import { db } from './../db'

import { createResource, Match, Switch } from 'solid-js'
import fc from 'fast-check'
import { template as arbitraryTemplate } from '../../tests/arbitraryTemplate'
import { card as arbitraryCard } from '../../tests/arbitraryCard'
import { note as arbitraryNote } from '../../tests/arbitraryNote'

const numRuns = 10 // getting database corruption if we use larger numbers. lowTODO fix by upgrading
const endOnFailure = true // no shrinking since it makes the db corruption worse

async function testTemplate() {
	await fc.assert(
		fc.asyncProperty(arbitraryTemplate, async (expected) => {
			await db.upsertTemplate(expected)
			const actual = await db.getTemplate(expected.id)
			const r = isEqual(expected, actual)
			console.assert(r, { expected, actual })
			return r
		}),
		{ verbose: true, numRuns, endOnFailure },
	)
	return true
}

async function testNote() {
	const templates = await db.getTemplates()
	await fc.assert(
		fc.asyncProperty(
			fc.constantFrom(...templates).chain(arbitraryNote),
			async (expected) => {
				await db.upsertNote(expected)
				const actual = await db.getNote(expected.id)
				const r = isEqual(expected, actual)
				console.assert(r, { expected, actual })
				return r
			},
		),
		{ verbose: true, numRuns, endOnFailure },
	)
	return true
}

async function testCard() {
	await fc.assert(
		fc.asyncProperty(arbitraryCard, async (expected) => {
			await db.upsertCard(expected)
			const actual = await db.getCard(expected.id)
			const r = isEqual(expected, actual)
			console.assert(r, { expected, actual })
			return r
		}),
		{ verbose: true, numRuns, endOnFailure },
	)
	return true
}

export default function TestDb(): JSX.Element {
	const [testsResult] = createResource(async () => {
		const template = await testTemplate()
		const note = await testNote()
		const card = await testCard()
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
