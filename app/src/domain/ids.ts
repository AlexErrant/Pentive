import { Brand } from "shared"

export type RemoteTemplateId = Brand<string, "remoteTemplateId" & "base64url">
export type RemoteCardId = Brand<string, "remoteCardId" & "base64url">

export {
  TemplateId,
  NoteId,
  UserId,
  Ord,
  PluginId,
  Side,
  CardId,
  MediaId,
} from "shared"

export type CardSettingId = Brand<string, "cardSettingId" & "base64url">

export type DeckId = Brand<string, "deckId">

export type RemoteMediaNum = Brand<number, "remoteMediaNum">
