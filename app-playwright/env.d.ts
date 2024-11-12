/* eslint-disable @typescript-eslint/naming-convention */

interface ExtendedProcessEnv extends ProcessEnv {
	readonly VITE_APP_ORIGIN: string
	readonly VITE_APP_UGC_ORIGIN: string
}
