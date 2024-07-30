import { parse, serialize } from 'cookie-es'
import { type WithRequired } from 'shared'
import { type CookieSerializeOptions } from 'vinxi/http'

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

	parse(cookieHeader: string | undefined | null) {
		if (cookieHeader == null) return null
		const cookies = parse(cookieHeader)
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
