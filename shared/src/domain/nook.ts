export const nookTypes = ['public', 'restricted', 'private'] as const
export type NookType = (typeof nookTypes)[number]
