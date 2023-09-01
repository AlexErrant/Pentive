import { base64ToArray } from 'shared-edge'

let hubSessionSecret: null | Uint8Array = null

export function getHubSessionSecret(
	hubSessionSecretString: string,
): Uint8Array {
	if (hubSessionSecret === null) {
		hubSessionSecret = base64ToArray(hubSessionSecretString)
	}
	return hubSessionSecret
}
