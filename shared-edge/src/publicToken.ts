import { type Brand, type Base64Url, type Base64 } from 'shared/brand'
import { concat } from 'shared/utility'
import { base64, base64urlnopad } from '@scure/base'

/*

Lifecycle of img src in `<img src="my-file.jpg">`

app persisted = user-provided-filename.jpg
upload to cwa = imgPlaceholder<then>imgHash.jpg
ivy persisted = imgHmac.jpg
                where imgHmac = remoteEntityId + imgHash

grep 69D0971A-FE47-4D4F-91B9-15A6FAA3CAF1

*/

export async function buildPublicToken(
	entityId: Base64Url,
	mediaHash: Base64,
	publicMediaSecretBase64: PublicMediaSecretBase64,
) {
	const data = concat(base64urlnopad.decode(entityId), base64.decode(mediaHash))
	const key = await getPublicMediaKey(publicMediaSecretBase64)
	const hmac = await crypto.subtle.sign('HMAC', key, data)
	return base64urlnopad.encode(new Uint8Array(hmac)) as Base64Url
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
