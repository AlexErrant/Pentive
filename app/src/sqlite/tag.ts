import { type NoteId } from 'shared'
import { stringifyTagsArray } from './util'
import { ky } from '../topLevelAwait'

export const tagCollectionMethods = {
	getTags: async function () {
		const tags = await ky
			.selectFrom('distinctCardTag')
			.select('tag')
			// .union((db) => db.selectFrom('distinctNoteTag').select('tag'))
			.orderBy('tag')
			.execute()
		return tags.map((t) => t.tag)
	},
	saveTags: async function (noteId: NoteId, tags: string[]) {
		await ky
			.updateTable('note')
			.set({ tags: stringifyTagsArray(tags) })
			.where('id', '=', noteId)
			.execute()
	},
}
