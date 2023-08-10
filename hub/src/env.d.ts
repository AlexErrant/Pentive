// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="@cloudflare/workers-types" />

import { type Base64 } from "shared"

export interface EnvVars {
  planetscaleDbUrl: string
  hubSessionSecret: Base64
  csrfSecret: Base64
  alphaKey: string
  discordId: string
  discordSecret: string
  githubId: string
  githubSecret: string
  oauthStateSecret: Base64
  oauthCodeVerifierSecret: Base64
  hubInfoSecret: Base64
}

declare global {
  interface Env extends EnvVars {}
}
