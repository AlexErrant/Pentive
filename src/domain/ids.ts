type Brand<T, B> = T & { brand: B } // https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d

export type UserId = Brand<string, "userId">

export type StencilRevisionId = Brand<string, "stencilRevisionId">
export type SpecimenRevisionId = Brand<string, "specimenRevisionId">

export type TemplateId = Brand<string, "templateId">
export type ChildTemplateId = Brand<string, "childTemplateId">
export type ClozeIndex = Brand<number, "clozeIndex">

export type ExampleId = Brand<string, "exampleId">
export type CardSettingId = Brand<string, "cardSettingId">

export type DeckId = Brand<string, "deckId">
