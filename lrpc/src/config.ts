import * as dotenv from "dotenv"
import { base64ToArray } from "shared"
import { z } from "zod"

// lowTODO figure out how to get/manage/merge ENV variables from serverless.yml

const rawConfig = dotenv.config()

if (rawConfig.error !== undefined) {
  throw new Error(
    `Error with .env file:\r\n${JSON.stringify(rawConfig.error, null, 4)}`
  )
}

const envZ = z.object({
  /* eslint-disable @typescript-eslint/naming-convention */
  planetscaleDbUrl: z.string(),
  jwsSecret: z.string(),
  IS_OFFLINE: z.literal("true").or(z.undefined()),
  /* eslint-enable @typescript-eslint/naming-convention */
})

const config = envZ.parse(rawConfig.parsed)
export default config

export const jwsSecret = base64ToArray(config.jwsSecret)
