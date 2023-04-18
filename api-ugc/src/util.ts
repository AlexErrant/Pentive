import { type Context } from "hono"

export type ApiUgcContext = Context<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Bindings: Env
  },
  unknown
>

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  mediaBucket: R2Bucket
  planetscaleDbUrl: string
  appOrigin: string
  hubOrigin: string
}
