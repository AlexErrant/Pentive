import { cardCollectionMethods } from './sqlite/card'
import { noteCollectionMethods } from './sqlite/note'
import { templateCollectionMethods } from './sqlite/template'
import { mediaCollectionMethods } from './sqlite/media'
import { pluginCollectionMethods } from './sqlite/plugin'
// import { dexieMethods } from "./dexie/dexie"
import { sync } from './sqlite/crsqlite'
import { remoteMediaCollectionMethods } from './sqlite/remoteMedia'
import { tagCollectionMethods } from './sqlite/tag'
import { reviewCollectionMethods } from './sqlite/review'
import { settingsCollectionMethods } from './sqlite/settings'

export const db = {
	...remoteMediaCollectionMethods,
	...templateCollectionMethods,
	...pluginCollectionMethods,
	...cardCollectionMethods,
	...noteCollectionMethods,
	// ...dexieMethods,
	...mediaCollectionMethods,
	...tagCollectionMethods,
	...reviewCollectionMethods,
	...settingsCollectionMethods,
	sync,
}
