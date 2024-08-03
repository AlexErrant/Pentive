import * as dotenv from 'dotenv'
import { z } from 'zod'

// lowTODO figure out how to get/manage/merge ENV variables from serverless.yml

const rawConfig = dotenv.config()

if (rawConfig.error !== undefined) {
	throw new Error(
		`Error with .env file:\r\n${JSON.stringify(rawConfig.error, null, 4)}`,
	)
}

const envZ = z.object({
	/* eslint-disable @typescript-eslint/naming-convention */
	tursoDbUrl: z.string(),
	tursoAuthToken: z.string(),
	hubSessionSecret: z.string(),
	IS_OFFLINE: z.literal('true').or(z.undefined()),
	/* eslint-enable @typescript-eslint/naming-convention */
})

const config = envZ.parse(rawConfig.parsed)
export default config

// grep 8AB879F7-16F0-409F-BAAB-5FB8EB32000D
export function base64ToArray(base64: string): Uint8Array {
	const binaryString = atob(base64)
	const len = binaryString.length
	const bytes = new Uint8Array(len)
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i)
	}
	return bytes
}

export const hubSessionSecret = base64ToArray(config.hubSessionSecret)
