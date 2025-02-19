// c.f. https://github.com/panva/jose/blob/e8cf88a4555385ea6ee41a2015f869888649caa2/src/runtime/browser/base64url.ts

import type { Base64Url, Base64 } from './brand'

// https://web.dev/articles/base64-encoding#btoa_and_atob_with_unicode
export function arrayToBase64(bytes: Uint8Array<ArrayBuffer>): Base64 {
	const binString = String.fromCodePoint(...bytes)
	return btoa(binString).replaceAll('=', '') as Base64
}

// https://web.dev/articles/base64-encoding#btoa_and_atob_with_unicode
export function base64ToArray(base64: Base64): Uint8Array<ArrayBuffer> {
	const binString = atob(base64)
	return Uint8Array.from(binString, (m) => m.codePointAt(0)!)
}

export function toBase64URL(base64: Base64): Base64Url {
	return base64.replaceAll('+', '-').replaceAll('/', '_') as Base64Url
}

export function fromBase64URL(base64url: Base64Url): Base64 {
	return base64url.replaceAll('-', '+').replaceAll('_', '/') as Base64
}

export function arrayToBase64url(bytes: Uint8Array<ArrayBuffer>): Base64Url {
	return toBase64URL(arrayToBase64(bytes))
}

export function base64urlToArray(base64: Base64Url): Uint8Array<ArrayBuffer> {
	return base64ToArray(fromBase64URL(base64))
}

// uses big endian
export function numberToUint8Array(num: number): Uint8Array {
	const arr = new Uint8Array(6)
	for (let i = 0; i < 6; i++) {
		const divisor = Math.pow(256, 5 - i)
		arr[i] = Math.floor(num / divisor) % 256
	}
	return arr
}

export function uint8ArrayToNumber(arr: Uint8Array): number {
	let num = 0
	for (let i = 0; i < 6; i++) {
		num = num * 256 + arr[i]!
	}
	return num
}

export function incrementUint8Array(arr: Uint8Array): void {
	for (let i = arr.length - 1; i >= 0; i--) {
		if (arr[i]! < 255) {
			arr[i]!++
			return
		}
		arr[i] = 0
	}
	throw new Error('Overflow: Cannot increment beyond maximum value')
}

