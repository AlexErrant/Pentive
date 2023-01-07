type Brand<T, B> = T & { readonly brand: B } // https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d

export type Base64 = Brand<string, "base64">
export type Hex = Brand<string, "hex">
