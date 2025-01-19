// c.f. https://github.com/panva/jose/blob/e8cf88a4555385ea6ee41a2015f869888649caa2/src/runtime/browser/base64url.ts

import { type Base64 } from './brand'

// https://web.dev/articles/base64-encoding#btoa_and_atob_with_unicode
export function arrayToBase64(bytes: Uint8Array): Base64 {
	const binString = String.fromCodePoint(...bytes)
	return btoa(binString).replaceAll('=', '') as Base64
}

// https://web.dev/articles/base64-encoding#btoa_and_atob_with_unicode
export function base64ToArray(base64: Base64): Uint8Array {
	const binString = atob(base64)
	return Uint8Array.from(binString, (m) => m.codePointAt(0)!)
}
