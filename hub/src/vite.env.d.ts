 
 
/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_HUB_DOMAIN: string
	readonly VITE_HUB_ORIGIN: string
	readonly VITE_APP_ORIGIN: string
	readonly VITE_HUB_UGC_ORIGIN: string
	readonly VITE_CWA_URL: string
	readonly VITE_AUGC_URL: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
