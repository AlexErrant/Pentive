import { Dexie } from 'dexie'
import { type MediaId, type Media } from 'shared'
import type { Plugin } from 'shared-dom'
import * as Comlink from 'comlink'

class DexieDb extends Dexie {
	media!: Dexie.Table<Media, string>
	plugins!: Dexie.Table<Plugin, string>

	constructor() {
		super('MyAppDatabase')
		this.version(1).stores({
			media: 'id',
			plugins: 'id',
		})
	}
}

const ddb = new DexieDb()

export const dexieMethods = {
	async bulkAddMedia(media: Media[]) {
		await ddb.media.bulkAdd(media)
	},
	async getMedia(id: MediaId) {
		// This helps detect memory leaks - if you see this log 100x, something's very wrong.
		console.debug('getMedia for ' + id)
		// highTODO perf is abysmal https://stackoverflow.com/q/20809832
		// Consider using Origin Private File System once it's on Android Chrome https://chromestatus.com/feature/5079634203377664 https://bugs.chromium.org/p/chromium/issues/detail?id=1011535#c9
		const media = await ddb.media.get(id)
		const data = media?.data ?? undefined
		if (data == null) {
			return data
		} else {
			return Comlink.transfer(media, [data])
		}
	},
}
