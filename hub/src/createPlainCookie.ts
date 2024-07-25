import { parse, serialize } from 'cookie'
import { type CookieSerializeOptions } from 'vinxi/http'

export class Cookie {
	constructor(name: string, cookieOptions: CookieSerializeOptions) {
		this.name = name
		this.cookieOptions = cookieOptions
	}

	name: string
	cookieOptions: CookieSerializeOptions

	expires() {
		// Max-Age takes precedence over Expires
		return typeof this.cookieOptions.maxAge !== 'undefined'
			? new Date(Date.now() + this.cookieOptions.maxAge * 1000)
			: this.cookieOptions.expires
	}

	parse(cookieHeader: string | undefined | null) {
		if (cookieHeader == null) return null
		const cookies = parse(cookieHeader)
		return cookies[this.name]
	}

	serialize(value: string) {
		return serialize(this.name, value, this.cookieOptions)
	}
}
