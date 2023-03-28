/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUGC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
