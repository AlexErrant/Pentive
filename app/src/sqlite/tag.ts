import { toLDbId, type NoteId } from 'shared/brand'
import { ky, tx } from '../topLevelAwait'
import { type InsertObject, sql } from 'kysely'
import type { CardTag, DB, NoteTag } from './database'

export const tagCollectionMethods = {
	getTags: async function () {
		const tags = await ky
			.selectFrom('distinctCardTag')
			.select('tag')
			.union((db) => db.selectFrom('distinctNoteTag').select('tag'))
			.orderBy('tag')
			.execute()
		return tags.map((t) => t.tag)
	},
	saveTags: async function (noteId: NoteId, tags: string[]) {
		const noteDbId = toLDbId(noteId)
		await saveTags(
			[noteDbId],
			tags.map((tag) => ({ tag, noteId: noteDbId })),
		)
	},
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- interface doesn't work with `withTables`
export type NoteTagRowid = {
	// I'm not adding rowid to the official type definition because it adds noise to Insert/Update/Conflict resolution types
	noteTag: NoteTag & { rowid: number }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- interface doesn't work with `withTables`
export type CardTagRowid = {
	// I'm not adding rowid to the official type definition because it adds noise to Insert/Update/Conflict resolution types
	cardTag: CardTag & { rowid: number }
}

export async function saveTags(
	noteIds: NoteId[],
	tags: Array<InsertObject<DB, 'noteTag'>>,
) {
	await tx(async (ky) => {
		const notesTagsJson = JSON.stringify(
			tags.map((t) => ({ [t.noteId as string]: t.tag })),
		)
		await ky
			.withTables<NoteTagRowid>()
			.deleteFrom('noteTag')
			.where(
				'rowid',
				'in',
				sql<number>`
(SELECT rowid
FROM (SELECT noteId, tag FROM noteTag where noteId in (${sql.join(noteIds)})
      EXCEPT
      SELECT key AS noteId,
             value AS tag
      FROM json_tree(${notesTagsJson})
      WHERE TYPE = 'text'
     ) as x
JOIN noteTag ON noteTag.noteId = x.noteId AND noteTag.tag = x.tag)`,
			)
			.execute()
		if (tags.length !== 0) {
			await ky
				.insertInto('noteTag')
				.values(tags)
				.onConflict((x) => x.doNothing())
				.execute()
		}
	})
}
