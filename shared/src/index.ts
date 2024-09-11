import sqlJson from './sql.json'
export const initSql = sqlJson

// hacky, but better than my previous solution, which was to parse the value, which was slow(er) and fragile.
export const imgPlaceholder = '3Iptw8cmfkd/KLrTw+9swHnzxxVhtDCraYLejUh3'
export const relativeChar = '/'

export * from './brand'
export * from './schema'
export * from './htmlToText'
export * from './utility'
export * from './headers'
export * from './publicToken'
export * from './domain/card'
export * from './domain/note'
export * from './domain/nook'
export * from './domain/template'
export * from './domain/media'
export * from './domain/user'
export * from './domain/review'
export * from './domain/cardSetting'
export * from './result'
export * from './caseFold'
