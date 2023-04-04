// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="@cloudflare/workers-types" />

import { Base64 } from "shared"

export interface EnvVars {
  planetscaleDbUrl: string
  hubSessionSecret: Base64
  jwsSecret: Base64
  csrfSecret: Base64
  authJsSecret: Base64
  discordId: string
  discordSecret: string
  githubId: string
  githubSecret: string
}

declare global {
  interface Env extends EnvVars {}
}
