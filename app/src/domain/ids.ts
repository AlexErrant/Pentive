type Brand<T, B> = T & { readonly brand: B } // https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d

export type RemoteTemplateId = Brand<string, "remoteTemplateId" & "base64url">
export type RemoteCardId = Brand<string, "remoteCardId" & "base64url">

export {
  TemplateId,
  NoteId,
  UserId,
  ChildTemplateId,
  ClozeIndex,
  Pointer,
  PluginId,
} from "shared"
export type Side = "front" | "back"

export type CardId = Brand<string, "cardId" & "base64url">
export type CardSettingId = Brand<string, "cardSettingId" & "base64url">

export type DeckId = Brand<string, "deckId">

export type MediaId = Brand<string, "mediaId">
export type RemoteMediaNum = Brand<number, "remoteMediaNum">
