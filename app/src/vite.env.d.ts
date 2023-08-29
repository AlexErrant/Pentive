/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_CWA_URL: string
	readonly VITE_AUGC_URL: string
	readonly VITE_APP_UGC_ORIGIN: string
	readonly VITE_PEER_HOST: string
	readonly VITE_PEER_PORT: string
	readonly VITE_HUB_ORIGIN: string
	readonly VITE_AG_GRID_LICENSE: string
	readonly VITE_PEER_SYNC_PUBLIC_KEY: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
