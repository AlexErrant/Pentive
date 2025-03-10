/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_IFRAME_RESIZER_LICENSE: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
