type Brand<T, B> = T & { readonly brand: B } // https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d

export type UserId = Brand<string, "userId">

export type RemoteTemplateId = Brand<string, "remoteTemplateId" & "base64url">
export type RemoteCardId = Brand<string, "remoteCardId" & "base64url">
export type RemoteResourceId = Brand<string, "remoteResourceId">

export { TemplateId, NoteId } from "shared"
export type ChildTemplateId = Brand<string, "childTemplateId">
export type ClozeIndex = Brand<number, "clozeIndex">
export type Pointer = ChildTemplateId | ClozeIndex
export type Side = "front" | "back"

export type CardId = Brand<string, "cardId" & "base64url">
export type CardSettingId = Brand<string, "cardSettingId" & "base64url">

export type DeckId = Brand<string, "deckId">

export type PluginId = Brand<string, "pluginId" & "base64url">
export type ResourceId = Brand<string, "resourceId">
export type RemoteMediaNum = Brand<number, "remoteMediaNum">
