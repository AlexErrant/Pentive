import { type Brand, type Base64Url, type Base64 } from 'shared/brand'
import { concat } from 'shared/utility'
import { base64 } from '@scure/base'
import {
	decodeBase64,
	decodeBase64Url,
	encodeBase64Url,
} from 'hono/utils/encode'

/*

Lifecycle of img src in `<img src="my-file.jpg">`

app persisted = user-provided-filename.jpg
upload to cwa = imgPlaceholder<then>imgHash.jpg
ivy persisted = imgHmac.jpg
                where imgHmac = remoteEntityId + imgHash

*/

export async function buildPublicToken(
	entityId: Base64Url,
	mediaHash: Base64,
	publicMediaSecretBase64: PublicMediaSecretBase64,
) {
	const data = concat(decodeBase64Url(entityId), decodeBase64(mediaHash))
	const key = await getPublicMediaKey(publicMediaSecretBase64)
	const hmac = await crypto.subtle.sign('HMAC', key, data)
	return encodeBase64Url(hmac) as Base64Url
}

export type PublicMediaSecretBase64 = Brand<
	string,
	'PublicMediaSecretBase64' | 'base64'
>

let maybePublicMediaKey: CryptoKey | null = null
async function getPublicMediaKey(
	publicMediaSecretBase64: PublicMediaSecretBase64,
): Promise<CryptoKey> {
	if (maybePublicMediaKey == null) {
		maybePublicMediaKey = await crypto.subtle.importKey(
			'raw',
			base64.decode(publicMediaSecretBase64),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign', 'verify'],
		)
	}
	return maybePublicMediaKey
}
