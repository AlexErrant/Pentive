import { type CookieParseOptions, parse, serialize } from 'cookie-es'
import { type JWTVerifyResult, type SignJWT, jwtVerify } from 'jose'
import { type WithRequired, concat } from 'shared/utility'
import { type Base64, type Brand } from 'shared/brand'
import { arrayToBase64, base64ToArray } from 'shared/binary'
import { type CookieSerializeOptions } from 'vinxi/http'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// prefer maxAge over expires because "If both Expires and Max-Age are set, Max-Age has precedence." https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#max-agenumber
type MaxAgeOverExpires = WithRequired<
	Omit<CookieSerializeOptions, 'expires'>,
	'maxAge'
>

export class CookieManager {
	constructor(name: string, cookieOptions: MaxAgeOverExpires) {
		this.name = name
		this.cookieOptions = cookieOptions
	}

	name: string
	cookieOptions: CookieSerializeOptions

	parse(cookieHeader: string | undefined | null, options?: CookieParseOptions) {
		if (cookieHeader == null) return null
		const cookies = parse(cookieHeader, options)
		return cookies[this.name]
	}

	serialize(value: string) {
		return serialize(this.name, value, this.cookieOptions)
	}

	clear() {
		return serialize(this.name, '', {
			...this.cookieOptions,
			maxAge: 0, // https://stackoverflow.com/a/60931519
		})
	}
}

export class EncryptedCookieManager {
	constructor(name: string, cookieOptions: MaxAgeOverExpires) {
		this.cm = new CookieManager(name, cookieOptions)
	}

	cm: CookieManager

	async serialize(value: string, secret: Base64) {
		if (this.key == null) await this.setKey(secret) // avoiding an `await` when the key is cached, hence the ! assertion in the line below
		const cipher = await encrypt(value, this.key!)
		return this.cm.serialize(cipher)
	}

	async parse(value: string | null | undefined, secret: Base64) {
		const cipher = this.cm.parse(value) as IvCipher
		if (this.key == null) await this.setKey(secret) // avoiding an `await` when the key is cached, hence the ! assertion in the line below
		return await decrypt(cipher, this.key!)
	}

	clear() {
		return this.cm.clear()
	}

	key: CryptoKey | undefined
	async setKey(secret: Base64) {
		this.key = await crypto.subtle.importKey(
			'raw',
			base64ToArray(secret),
			{
				name: 'AES-GCM',
			},
			false,
			['encrypt', 'decrypt'],
		)
	}
}

const ivLength = 12 // https://crypto.stackexchange.com/q/41601

type IvCipher = Brand<string, 'ivCipher'> & Base64

function splitIvCipher(ivCipher: ArrayBuffer): [ArrayBuffer, ArrayBuffer] {
	const iv = ivCipher.slice(0, ivLength)
	const cipher = ivCipher.slice(ivLength)
	return [iv, cipher]
}

async function encrypt(value: string, key: CryptoKey) {
	const iv = crypto.getRandomValues(new Uint8Array(ivLength))
	const cipher = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		key,
		encoder.encode(value),
	)
	const ivCipher = concat(iv, cipher)
	return arrayToBase64(ivCipher) as IvCipher
}

async function decrypt(ivCipher: IvCipher, key: CryptoKey) {
	const [iv, cipher] = splitIvCipher(base64ToArray(ivCipher).buffer)
	const decrypted = await crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		key,
		cipher,
	)
	return decoder.decode(decrypted)
}

export class SignedCookieManager {
	constructor(name: string, cookieOptions: MaxAgeOverExpires) {
		this.cm = new CookieManager(name, { ...cookieOptions, encode: (x) => x })
	}

	cm: CookieManager

	async serialize(signJWT: SignJWT, secret: Base64) {
		if (this.key == null) await this.setKey(secret) // avoiding an `await` when the key is cached, hence the ! assertion below
		const jwt = await signJWT
			.setProtectedHeader({ alg: 'HS256' }) // No reason to go asymmetric yet https://crypto.stackexchange.com/a/30660
			.sign(this.key!)
		return this.cm.serialize(jwt)
	}

	async parse(cookie: string | null | undefined, secret: Base64) {
		const jwt = this.cm.parse(cookie, { decode: (x) => x })
		if (typeof jwt !== 'string' || jwt.length === 0) {
			return null
		}
		if (this.key == null) await this.setKey(secret) // avoiding an `await` when the key is cached, hence the ! assertion in the line below
		let result: JWTVerifyResult | null = null
		try {
			result = await jwtVerify(jwt, this.key!)
		} catch {}
		return result == null ? null : result.payload
	}

	clear() {
		return this.cm.clear()
	}

	key: CryptoKey | undefined
	async setKey(secret: Base64) {
		this.key = await crypto.subtle.importKey(
			'raw',
			base64ToArray(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign', 'verify'],
		)
	}
}
