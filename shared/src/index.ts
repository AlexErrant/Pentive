import sqlJson from './sql.json' assert { type: 'json' }
export const initSql = sqlJson

// hacky, but better than my previous solution, which was to parse the value, which was slow(er) and fragile.
export const imgPlaceholder = '3Iptw8cmfkd/KLrTw+9swHnzxxVhtDCraYLejUh3'
export const relativeChar = '/'

export * from './brand.js'
export * from './schema.js'
export * from './htmlToText.js'
export * from './utility.js'
export * from './headers.js'
export * from './publicToken.js'
export * from './domain/card.js'
export * from './domain/note.js'
export * from './domain/nook.js'
export * from './domain/template.js'
export * from './domain/media.js'
export * from './domain/user.js'
export * from './domain/review.js'
export * from './domain/cardSetting.js'
export * from './result.js'
export * from './caseFold.js'
export * from '@scure/base'
