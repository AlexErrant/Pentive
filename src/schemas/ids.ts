type Brand<T, B> = T & { brand: B } // https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d

export type UserId = Brand<string, "UserId">

export type StencilRevisionId = Brand<string, "StencilRevisionId">

export type TemplateId = Brand<string, "TemplateId">
export type CardTemplateId = Brand<string, "CardTemplateId">
export type TemplateOrdinal = Brand<number, "TemplateOrdinal">
