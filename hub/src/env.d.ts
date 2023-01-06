// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="@cloudflare/workers-types" />

export {}

declare global {
  interface Env {
    planetscaleDbUrl: string
  }
}
