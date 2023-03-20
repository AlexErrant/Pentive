/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CWA_URL: string
  readonly VITE_APP_UGC_ORIGIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
