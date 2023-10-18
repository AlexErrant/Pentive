import { getKysely } from './crsqlite'
import { toastFatal, toastImpossible } from '../components/toasts'
import { type Card, type Note } from './database'
import { type NoteId } from 'shared'
import { unitSeparator } from './util'

export const tagCollectionMethods = {
	// This insanity with `noteFtsTagVocab` is to get properly cased tags.
	// Possible improvements are to either
	// 1. Implement a custom case-sensitive tokenizer in C/Rust/Zig.
	// 2. Create a trigger that adds/removes to a tags table/cache based on updates to notes.
	//    You'll still need a FTS index on tags to make checking for the existence of a
	//    tag easier (so you can then safely delete a tag)
	getTags: async function () {
		const db = await getKysely()
		const noteTagsOffsets = db
			// I'm not adding rowid to the official type definition of Notes because it adds noise to Insert/Update/Conflict resolution types
			.withTables<{ note: Note & { rowid: number } }>()
			.with('vocab', (db) =>
				db
					.selectFrom('noteFtsTagVocab')
					// casing is based on first doc's tags
					.select((eb) => [eb.fn.min('doc').as('doc'), 'offset'])
					.where('col', '=', 'tags')
					.groupBy('term'),
			)
			.selectFrom('note')
			.innerJoin('vocab', 'vocab.doc', 'note.rowid')
			.select(['offset', 'tags'])
			.execute()
		const cardTagsOffsets = db
			// I'm not adding rowid to the official type definition of Cards because it adds noise to Insert/Update/Conflict resolution types
			.withTables<{ card: Card & { rowid: number } }>()
			.with('vocab', (db) =>
				db
					.selectFrom('cardFtsTagVocab')
					// casing is based on first doc's tags
					.select((eb) => [eb.fn.min('doc').as('doc'), 'offset'])
					.where('col', '=', 'tags')
					.groupBy('term'),
			)
			.selectFrom('card')
			.innerJoin('vocab', 'vocab.doc', 'card.rowid')
			.select(['offset', 'tags'])
			.execute()
		return (await noteTagsOffsets)
			.concat(await cardTagsOffsets)
			.map(({ offset, tags }) => {
				const tagsArray = tags.split(unitSeparator)
				return (
					tagsArray[offset] ??
					toastImpossible(
						`Offset ${offset} for ${tagsArray.join(',')} is out of bounds.`,
					)
				)
			})
			.sort()
	},
	saveTags: async function (noteId: NoteId, tags: string[]) {
		const db = await getKysely()
		await db
			.updateTable('note')
			.set({ tags: stringifyTagsArray(tags) })
			.where('id', '=', noteId)
			.execute()
	},
}

function stringifyTagsArray(tags: string[]) {
	for (const tag of tags) {
		if (tag.includes(unitSeparator))
			toastFatal('Tags cannot contain the unit separator.')
	}
	return tags.join(unitSeparator)
}

// highTODO property test
export function stringifyTags(tags: Set<string>) {
	return stringifyTagsArray(Array.from(tags.values()))
}

export function parseTags(rawTags: string) {
	if (rawTags === '') return new Set<string>()
	const parsed = rawTags.split(unitSeparator)
	return new Set(parsed)
}
