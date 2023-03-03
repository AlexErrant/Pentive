export type Brand<T, B> = T & { readonly brand: B } // https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d

export type Base64 = Brand<string, "base64">
export type Base64Url = Brand<string, "base64url">
export type Hex = Brand<string, "hex">
export type DbId = Brand<string, "dbId">
export type LDbId = Brand<string, "dbId" & "base64url"> // L means local/Lite. nix `base64url` upon v3.41 - grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB

export type TemplateId = Brand<string, "templateId" & "base64url">
export type RemoteTemplateId = Brand<string, "remoteTemplateId" & "base64url">
export type ChildTemplateId = Brand<string, "childTemplateId">
export type ClozeIndex = Brand<number, "clozeIndex">
export type Pointer = ChildTemplateId | ClozeIndex

export type NoteId = Brand<string, "noteId" & "base64url">
export type RemoteNoteId = Brand<string, "remoteNoteId" & "base64url">

export type UserId = Brand<string, "userId">

export type NookId = Brand<string, "nookId">

export type PluginId = Brand<string, "pluginId" & "base64url">
