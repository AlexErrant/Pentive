// c.f. https://github.com/panva/jose/blob/e8cf88a4555385ea6ee41a2015f869888649caa2/src/runtime/browser/base64url.ts

import { type Base64 } from './brand'

// https://stackoverflow.com/a/38858127/
export function arrayBufferToBase64(buffer: ArrayBuffer): Base64 {
	const bytes = new Uint8Array(buffer)
	return uint8ArrayToBase64(bytes)
}

export function uint8ArrayToBase64(bytes: Uint8Array): Base64 {
	let binary = ''
	const len = bytes.byteLength
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]!)
	}
	return btoa(binary) as Base64
}

export function base64ToArray(base64: string): Uint8Array {
	const binaryString = atob(base64)
	const len = binaryString.length
	const bytes = new Uint8Array(len)
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i)
	}
	return bytes
}
