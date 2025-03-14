// c.f. https://github.com/panva/jose/blob/e8cf88a4555385ea6ee41a2015f869888649caa2/src/runtime/browser/base64url.ts

import type { Hex, Base64Url, Base64 } from './brand'
import { base16 } from '@scure/base'

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

export const epochLength = 6
export const randomLength = 10
export const idLength = epochLength + randomLength

// uses big endian
export function prefixEpochToArray(epoch: number, id: Uint8Array) {
	for (let i = 0; i < epochLength; i++) {
		const divisor = Math.pow(256, epochLength - 1 - i)
		id[i] = Math.floor(epoch / divisor) % 256
	}
}

export function idToEpoch(id: Uint8Array): number {
	let epoch = 0
	for (let i = 0; i < epochLength; i++) {
		epoch = epoch * 256 + id[i]!
	}
	return epoch
}

export function incrementRandom(arr: Uint8Array): void {
	for (let i = idLength - 1; i >= epochLength; i--) {
		if (arr[i]! < 255) {
			arr[i]!++
			return
		}
		arr[i] = 0
	}
	throw new Error('max random reached')
}

// inspired by https://github.com/ryan-mars/ulid-workers/blob/06689d9ddd894bfc608c6131f9bbd2a8b48bcbc8/src/ulid.ts#L147
export function idFactory() {
	let lastTime = -1
	const lastId = new Uint8Array(idLength)
	return () => {
		const epochMs = Date.now()
		if (epochMs > lastTime) {
			lastTime = epochMs
			crypto.getRandomValues(lastId)
			prefixEpochToArray(epochMs, lastId)
			return new Uint8Array(lastId)
		} else {
			incrementRandom(lastId)
			return new Uint8Array(lastId)
		}
	}
}

// separate from idFactory because it's only used by tests and adds unnecessary complexity/conditionals to idFactory
export const rawIdWithTime = (epochMs: number) => {
	const id = new Uint8Array(idLength)
	crypto.getRandomValues(id)
	prefixEpochToArray(epochMs, id)
	return id
}

export let rawId = idFactory()
export function hexId(): Hex {
	return base16.encode(rawId()) as Hex
}
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function base64urlId<T extends Base64Url>() {
	return arrayToBase64url(rawId()) as T
}
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function base64urlIdWithTime<T extends Base64Url>(epochMs: number) {
	return arrayToBase64url(rawIdWithTime(epochMs)) as T
}

const _binary =
	// doesn't actually error when built by `app`
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore don't look for `process` in the browser
	typeof window === 'undefined' && process.env.NODE_ENV === 'test'
		? {
				setRawId: (newRawId: typeof rawId) => {
					rawId = newRawId
				},
			}
		: (undefined as never)

export { _binary }
