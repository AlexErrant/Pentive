import { type Hex } from 'shared/brand'
import { ulidFactory } from 'ulid-workers'
import { base16, base32crockford } from '@scure/base'

export function ulidAsHex(): Hex {
	const raw = ulidAsRaw()
	return base16.encode(raw) as Hex
}

export function ulidAsRaw(): Uint8Array {
	const ulid = ulidFactory()()
	return base32crockford.decode('000000' + ulid).slice(4) // https://github.com/ulid/spec/issues/73#issuecomment-1247320475
}
