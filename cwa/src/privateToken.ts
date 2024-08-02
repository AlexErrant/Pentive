import { base64, type Base64Url, base64url, type Brand, concat } from 'shared'
import { type MediaHash } from './util'

export type UserId = Brand<string, 'userId'>
export type MediaTokenSecretBase64 = Brand<
	string,
	'mediaTokenSecretBase64' | 'base64'
>

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
	mediaTokenSecret: MediaTokenSecretBase64,
	mediaHash: MediaHash,
	userId: UserId,
): Promise<Base64Url> {
	const signature = await signMessage(mediaTokenSecret, mediaHash, userId)
	const token = concat(mediaHash, signature)
	return base64url.encode(token) as Base64Url
}

function parseToken(token: ArrayBuffer): [MediaHash, ArrayBuffer] {
	const mediaHash = token.slice(0, 32) as MediaHash
	const signature = token.slice(32)
	return [mediaHash, signature]
}

let maybeTokenKey: CryptoKey | null = null
async function getTokenKey(
	mediaTokenSecret: MediaTokenSecretBase64,
): Promise<CryptoKey> {
	if (maybeTokenKey == null) {
		maybeTokenKey = await crypto.subtle.importKey(
			'raw',
			base64.decode(mediaTokenSecret),
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
	mediaTokenSecret: MediaTokenSecretBase64,
	mediaHash: MediaHash,
	userId: UserId,
): Promise<ArrayBuffer> {
	const tokenKey = await getTokenKey(mediaTokenSecret)
	const message = buildMessage(userId, mediaHash)
	return await crypto.subtle.sign('HMAC', tokenKey, message)
}

export async function getMediaHash(
	mediaTokenSecret: MediaTokenSecretBase64,
	userId: UserId,
	token: ArrayBuffer,
): Promise<MediaHash | null> {
	const [mediaHash, signature] = parseToken(token)
	const tokenKey = await getTokenKey(mediaTokenSecret)
	const message = buildMessage(userId, mediaHash)
	const isValid = await crypto.subtle.verify(
		'HMAC',
		tokenKey,
		signature,
		message,
	)
	return isValid ? mediaHash : null
}
