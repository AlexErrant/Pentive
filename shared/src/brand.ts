// We do some questionable shit with Brands, e.g. `"templateId" & "base64url"`.
// This allows us to pass Ids into functions that expect a generic base64url.
// However, this means we don't use Zod brands,`which leads to issues like
// grep E7F24704-8D0B-460A-BF2C-A97344C535E0
// In particular, the fix https://github.com/colinhacks/zod/pull/2097" doesn't work for us

export type Brand<T, B> = T & { readonly brand: B } // https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d

export type Base64 = Brand<string, 'base64'>
export type Base64Url = CommentId | LocalId | LDbId

export type Hex = Brand<string, 'hex'>
export type DbId = Brand<ArrayBuffer, 'dbId'>
export type MediaHash = Brand<ArrayBuffer, 'mediaHash' & 'dbId'>
export type LDbId = Brand<string, 'dbId' & 'base64url'> // L means local/(sql)*L*ite. nix `base64url` upon v3.41 - grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB

export type TemplateId = Brand<string, 'templateId'>
export type RemoteTemplateId = Brand<string, 'remoteTemplateId'>
export type Ord = Brand<number, 'ord'>

export type CardId = Brand<string, 'cardId'>
export type Side = 'front' | 'back'

export type NoteId = Brand<string, 'noteId'>
export type RemoteNoteId = Brand<string, 'remoteNoteId'>

export type UserId = Brand<string, 'userId'>

export type NookId = Brand<string, 'nookId'>

export type PluginName = Brand<string, 'pluginName'>
export type PluginVersion = Brand<string, 'pluginVersion'>

export type MediaId = Brand<string, 'mediaId'>

export type CommentId = Brand<string, 'commentId'>

//

export type RemoteCardId = Brand<string, 'remoteCardId'>

export type SettingId = Brand<string, 'settingId'>
export type CardSettingId = Brand<string, 'cardSettingId'>

export type RemoteMediaNum = Brand<number, 'remoteMediaNum'>

export type PeerJsId = Brand<string, 'peerJsId'> // in uuid format
export type PeerDisplayName = Brand<string, 'peerDisplayName'>

export type ReviewId = Brand<string, 'reviewId'>

export function cast<T>(value: T) {
	// Do NOT cast from LocalId to RemoteId! This may compromise security - do not trust clients!
	// Only RemoteId to LocalId is valid!
	return value as T extends RemoteTemplateId
		? TemplateId
		: T extends RemoteNoteId
			? NoteId
			: never
}

type LocalId =
	| TemplateId
	| NoteId
	| CardId
	| ReviewId
	| CardSettingId
	| SettingId
	// remotes
	| RemoteTemplateId
	| RemoteNoteId
	| RemoteCardId

export function toLDbId<T extends LocalId | undefined | null>(value: T) {
	return value as unknown as T extends undefined
		? undefined
		: T extends null
			? null
			: LDbId
}

export function fromLDbId<T extends LocalId | undefined | null>(
	value: LDbId | null | undefined,
) {
	return value as T
}
