import { arrayToBase64url, base64ToArray } from 'shared/binary'
import type {
	Brand,
	MediaHash,
	Base64Url,
	Base64,
} from 'shared/brand'
import { concatAB, concat } from 'shared/utility'

export type UserId = Brand<string, 'userId'>
export type PrivateMediaSecret = Brand<string, 'PrivateMediaSecret'> & Base64

/*

`token` is `msg` + `signature`.
`msg` is just the `mediaHash`.
`message`, distinct from `msg`, is `msg` + `userId`.
`signature` is HMAC of `message`.
`userId` is omitted from `msg` to save space. `userId` will be determined from JWT.

                                                   token
               ______________________________________/\______________________________________
              /                                                                              \
              73724490b1f9c38e96a250a6ec84be72ad6a6b9325d4f22ddf4290ba606d5ef0366fda8447245343
              \__________________  __________________/\__________________  __________________/
                                 \/                                      \/
                                msg                                  signature
              \__________________  __________________/
                                 \/                   
    userId                   mediaHash
 _____/\_____  __________________/\__________________ 
/            \/                                      \
73724490b1f9c373724490b1f9c38e96a250a6ec84be72ad6a6b93
\_________________________  _________________________/
                          \/
                        message

*/

export async function buildPrivateToken(
	privateMediaSecret: PrivateMediaSecret,
	mediaHash: MediaHash,
	userId: UserId,
): Promise<Base64Url> {
	const signature = await signMessage(privateMediaSecret, mediaHash, userId)
	const token = concatAB(mediaHash, signature)
	return arrayToBase64url(token)
}

function parseToken(token: ArrayBuffer): [MediaHash, ArrayBuffer] {
	const mediaHash = token.slice(0, 32) as MediaHash
	const signature = token.slice(32)
	return [mediaHash, signature]
}

let maybeTokenKey: CryptoKey | null = null
async function getTokenKey(
	privateMediaSecret: PrivateMediaSecret,
): Promise<CryptoKey> {
	if (maybeTokenKey == null) {
		maybeTokenKey = await crypto.subtle.importKey(
			'raw',
			base64ToArray(privateMediaSecret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign', 'verify'],
		)
	}
	return maybeTokenKey
}

function buildMessage(userId: UserId, mediaHash: MediaHash): ArrayBuffer {
	const encodedUserId = new TextEncoder().encode(userId)
	return concat(encodedUserId, mediaHash)
}

async function signMessage(
	privateMediaSecret: PrivateMediaSecret,
	mediaHash: MediaHash,
	userId: UserId,
): Promise<ArrayBuffer> {
	const tokenKey = await getTokenKey(privateMediaSecret)
	const message = buildMessage(userId, mediaHash)
	return await crypto.subtle.sign('HMAC', tokenKey, message)
}

export async function getMediaHash(
	privateMediaSecret: PrivateMediaSecret,
	userId: UserId,
	token: ArrayBuffer,
): Promise<MediaHash | null> {
	const [mediaHash, signature] = parseToken(token)
	const tokenKey = await getTokenKey(privateMediaSecret)
	const message = buildMessage(userId, mediaHash)
	const isValid = await crypto.subtle.verify(
		'HMAC',
		tokenKey,
		signature,
		message,
	)
	return isValid ? mediaHash : null
}
