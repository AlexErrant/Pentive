import * as dotenv from "dotenv"
import { z } from "zod"

// lowTODO figure out how to get/manage/merge ENV variables from serverless.yml

let env = "dev"
if (process.env.ENV === undefined) {
  // e.g. use `ENV=prod ts-node-dev src/dev.ts` to change envs. On Windows, consider https://superuser.com/q/223104
  console.info("ENV is undefined - defaulting to `dev`.")
} else {
  env = process.env.ENV
}
const rawConfig = dotenv.config({ path: `.env.${env}` })

if (rawConfig.error !== undefined) {
  throw new Error(
    `Error with .env file:\r\n${JSON.stringify(rawConfig.error, null, 4)}`
  )
}

const envZ = z.object({
  /* eslint-disable @typescript-eslint/naming-convention */
  IVY_TABLE: z.string(),
  IS_OFFLINE: z.literal("true").or(z.undefined()),
  /* eslint-enable @typescript-eslint/naming-convention */
})

const config = envZ.parse(rawConfig.parsed)
export default config
