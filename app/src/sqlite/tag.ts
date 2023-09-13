import { getKysely } from './crsqlite'
import { toastImpossible } from '../components/toasts'
import { type Note } from './database'

export const unitSeparator = String.fromCharCode(31) // if this changes, also change noteFtsTag's separator 89CDE7EA-EF1B-4054-B381-597EE549CAB4

export const tagCollectionMethods = {
	// This insanity with `noteFtsTagVocab` is to get properly cased tags.
	// Possible improvements are to either
	// 1. Implement a custom case-sensitive tokenizer in C/Rust/Zig.
	// 2. Create a trigger that adds/removes to a tags table/cache based on updates to notes.
	//    You'll still need a FTS index on tags to make checking for the existence of a
	//    tag easier (so you can then safely delete a tag)
	getTags: async function () {
		const db = await getKysely()
		const tagsOffsets = await db
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
		return tagsOffsets.map(({ offset, tags }) => {
			const tagsArray = tags.split(unitSeparator)
			return (
				tagsArray[offset] ??
				toastImpossible(
					`Offset ${offset} for ${tagsArray.join(',')} is out of bounds.`,
				)
			)
		})
	},
}
