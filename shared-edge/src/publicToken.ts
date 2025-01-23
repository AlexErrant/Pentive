import {
	arrayToBase64url,
	base64ToArray,
	base64urlToArray,
} from 'shared/binary'
import {
	type Brand,
	type Base64Url,
	type Base64,
	type RemoteMediaId,
} from 'shared/brand'
import { concat } from 'shared/utility'

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
	mediaHash: Uint8Array,
	publicMediaSecret: PublicMediaSecret,
) {
	const data = concat(base64urlToArray(entityId), mediaHash)
	const key = await getPublicMediaKey(publicMediaSecret)
	const hmac = await crypto.subtle.sign('HMAC', key, data)
	return arrayToBase64url(new Uint8Array(hmac)) as RemoteMediaId
}

export type PublicMediaSecret = Brand<string, 'PublicMediaSecret'> & Base64

let maybePublicMediaKey: CryptoKey | null = null
async function getPublicMediaKey(
	publicMediaSecret: PublicMediaSecret,
): Promise<CryptoKey> {
	if (maybePublicMediaKey == null) {
		maybePublicMediaKey = await crypto.subtle.importKey(
			'raw',
			base64ToArray(publicMediaSecret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign', 'verify'],
		)
	}
	return maybePublicMediaKey
}
