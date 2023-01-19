// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="@cloudflare/workers-types" />

import { Base64 } from "shared"

declare global {
  interface Env {
    planetscaleDbUrl: string
    hubSessionSecret: Base64
    jwsSecret: Base64
  }
}
