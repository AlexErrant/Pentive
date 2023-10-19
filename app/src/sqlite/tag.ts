import { toastImpossible } from '../components/toasts'
import { type Card, type Note } from './database'
import { type NoteId } from 'shared'
import { stringifyTagsArray, unitSeparator } from './util'
import { ky } from '../topLevelAwait'

export const tagCollectionMethods = {
	// This insanity with `noteFtsTagVocab` is to get properly cased tags.
	// Possible improvements are to either
	// 1. Implement a custom case-sensitive tokenizer in C/Rust/Zig.
	// 2. Create a trigger that adds/removes to a tags table/cache based on updates to notes.
	//    You'll still need a FTS index on tags to make checking for the existence of a
	//    tag easier (so you can then safely delete a tag)
	getTags: async function () {
		const noteTagsOffsets = ky
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
		const cardTagsOffsets = ky
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
		await ky
			.updateTable('note')
			.set({ tags: stringifyTagsArray(tags) })
			.where('id', '=', noteId)
			.execute()
	},
}
