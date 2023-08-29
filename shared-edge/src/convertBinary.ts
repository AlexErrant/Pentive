import { type Base64, type Base64Url, type Hex } from 'shared'

import { ulidFactory } from 'ulid-workers'
import { base16, base32crockford, base64url } from '@scure/base'

// eslint-disable-next-line @typescript-eslint/naming-convention
export function toBase64URL_0(base64: Base64): Base64Url {
	return base64.replaceAll('+', '-').replaceAll('/', '_') as Base64Url
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function fromBase64URL_0(base64url: Base64Url): Base64 {
	return base64url.replaceAll('-', '+').replaceAll('_', '/') as Base64
}

export function binary16toBase64URL(base64: Base64): Base64Url {
	return base64
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.slice(0, 22) as Base64Url
}

export function binary16fromBase64URL(base64url: Base64Url): Base64 {
	return (base64url.replaceAll('-', '+').replaceAll('_', '/') + '==') as Base64
}

export function ulidAsHex(): Hex {
	const raw = ulidAsRaw()
	return base16.encode(raw) as Hex
}

export function ulidAsRaw(): Uint8Array {
	const ulid = ulidFactory()()
	return base32crockford.decode('000000' + ulid).slice(4) // https://github.com/ulid/spec/issues/73#issuecomment-1247320475
}

export function ulidAsBase64Url(): Base64Url {
	const raw = ulidAsRaw()
	return base64url.encode(raw).slice(0, 22) as Base64Url
}
