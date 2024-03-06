// lowTODO optimize https://sql.js.org/#/?id=use-as-web-worker https://gildas-lormeau.github.io/zip.js/api/interfaces/WorkerConfiguration.html#useWebWorkers
// prepared statements https://blog.logrocket.com/detailed-look-basic-sqljs-features/
// pagination https://stackoverflow.com/q/14468586

// lowTODO It would be nice if we could use wa-sqlite/cr-sqlite instead of sql.js
// since it would be less dependencies and less wasm binaries being cached by the service worker.
// However, until I figure out how to read from an existing sqlite file in cr-sqlite, we need both.
// See https://github.com/rhashimoto/wa-sqlite/discussions/72

import {
	BlobReader,
	BlobWriter,
	type Entry,
	TextWriter,
	Uint8ArrayWriter,
	ZipReader,
} from '@zip.js/zip.js'
import { notEmpty } from 'shared'
import initSqlJs, { type Database } from 'sql.js'
import {
	checkCard,
	checkCol,
	checkMedia,
	checkNote,
	checkRevlog,
	type Decks,
} from './typeChecker'
import {
	parseNote,
	parseCard,
	parseTemplates,
	parseRevlog,
	parseCardSetting,
} from './parser'
import {
	type Card as PCard,
	type Note as PNote,
	type Review,
	type Template,
	type MediaId,
	type TemplateId,
} from 'shared'
import { db } from './../../db'
import _ from 'lodash'
import sqliteUrl from '../../assets/sql-wasm.wasm?url'
import { C } from '../../topLevelAwait'

export async function importAnki(
	event: Event & {
		currentTarget: HTMLInputElement
		target: Element
	},
): Promise<void> {
	const ankiExport =
		// My mental static analysis says to use `currentTarget`, but it seems to randomly be null, hence `target`. I'm confused but whatever.
		(event.target as HTMLInputElement).files?.item(0) ??
		C.toastImpossible('There should be a file selected')
	const ankiEntries = await new ZipReader(
		new BlobReader(ankiExport),
	).getEntries()
	const sqlite =
		ankiEntries.find((e) => e.filename === 'collection.anki21') ??
		ankiEntries.find((e) => e.filename === 'collection.anki2') ??
		C.toastFatal(
			'`collection.anki21` or `collection.anki2` not found. When exporting from Anki, ensure that `Support older Anki versions` in the `Export` window is checked.',
		)
	await importAnkiDb(sqlite)
	await importAnkiMedia(ankiEntries) // running in parallel causes ERR_OUT_OF_MEMORY
}

async function importAnkiMedia(ankiEntries: Entry[]): Promise<void> {
	const media =
		ankiEntries.find((e) => e.filename === 'media') ??
		C.toastImpossible(
			`'media' not found in the provided file. Did Anki change their export format?`,
		)
	const mediaText =
		(await media.getData?.(new TextWriter())) ??
		C.toastImpossible(
			"Impossible since we're using `getEntries` https://github.com/gildas-lormeau/zip.js/issues/371",
		)
	const parsed = checkMedia(JSON.parse(mediaText))
	const entryChunks = _.chunk(ankiEntries, 1000)
	for (let i = 0; i < entryChunks.length; i++) {
		C.toastInfo(`Media ${i}/${entryChunks.length}`)
		await addMediaBatch(entryChunks[i]!, parsed)
	}
	C.toastInfo('Anki media import done!')
}

async function addMediaBatch(
	entries: Entry[],
	nameByI: Record<string, string>,
): Promise<void> {
	const mediaAndNulls = await Promise.all(
		entries.map(async (entry) => {
			const array =
				(await entry.getData?.(new Uint8ArrayWriter())) ??
				C.toastImpossible(
					"Impossible since we're using `getEntries` https://github.com/gildas-lormeau/zip.js/issues/371",
				)
			const name = nameByI[entry.filename]
			const now = C.getDate()
			return name == null // occurs for entries that aren't media, e.g. collection.anki2
				? null
				: {
						id: name as MediaId,
						created: now,
						updated: now,
						data: array.buffer,
				  }
		}),
	)
	const media = mediaAndNulls.filter(notEmpty)
	await db.bulkInsertMedia(media)
}

async function importAnkiDb(sqlite: Entry): Promise<void> {
	const ankiDb = await getAnkiDb(sqlite)
	const templatesMap = new Map<TemplateId, Template>()
	const notesMap = new Map<number, PNote>()
	let decks: Decks | undefined
	const cardsList: PCard[] = []
	try {
		// highTODO wrap in a transaction
		const cols = ankiDb.prepare('select * from col') // lowTODO select exact columns
		while (cols.step()) {
			const row = cols.getAsObject()
			const col = checkCol(row)
			decks = col.decks
			const templates = parseTemplates(col.models)
			await db.bulkInsertTemplate(templates)
			templates.forEach((t) => templatesMap.set(t.id, t))
			const cardSettings = parseCardSetting(col.dconf)
			await db.bulkUploadCardSettings(cardSettings)
		}
		cols.free()
		const notes = ankiDb.prepare('select * from notes') // lowTODO select exact columns
		while (notes.step()) {
			const row = notes.getAsObject()
			const note = checkNote(row)
			notesMap.set(note.id, parseNote(note, templatesMap))
		}
		notes.free()
		await db.bulkInsertNotes(Array.from(notesMap.values()))
		const cards = ankiDb.prepare('select * from cards') // lowTODO select exact columns
		while (cards.step()) {
			const row = cards.getAsObject()
			const card = checkCard(row)
			cardsList.push(parseCard(card, notesMap, templatesMap, decks!))
		}
		cards.free()
		await db.bulkUpsertCards(cardsList)
		const revlogs = ankiDb.prepare('select * from revlog') // lowTODO select exact columns
		const reviewList: Review[] = []
		while (revlogs.step()) {
			const row = revlogs.getAsObject()
			const revlog = checkRevlog(row)
			reviewList.push(parseRevlog(revlog))
		}
		await db.bulkUploadReview(reviewList)
		revlogs.free()
	} finally {
		ankiDb.close()
	}
	C.toastInfo('AnkiDB import done!')
}

async function getAnkiDb(sqlite: Entry): Promise<Database> {
	const [sql, sqliteBuffer] = await Promise.all([
		initSqlJs({
			locateFile: () => sqliteUrl,
		}),
		getSqliteBuffer(sqlite),
	])
	return new sql.Database(sqliteBuffer)
}

async function getSqliteBuffer(sqlite: Entry): Promise<Uint8Array> {
	const blob =
		(await sqlite.getData?.(new BlobWriter())) ??
		C.toastImpossible(
			"Impossible since we're using `getEntries` https://github.com/gildas-lormeau/zip.js/issues/371",
		)
	const arrayBuffer = await blob.arrayBuffer()
	return new Uint8Array(arrayBuffer)
}
