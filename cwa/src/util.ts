import { type Context } from 'hono'
import { type Brand } from 'shared'
import { type MediaTokenSecretBase64 } from './privateToken'

export type MediaHash = Brand<Uint8Array, 'mediaHash'>
export type UserId = Brand<string, 'userId'>

export type CwaContext = Context<{
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Bindings: Env
}>

// must be `type` https://github.com/honojs/hono/blob/main/docs/MIGRATION.md#use-type-to-define-the-generics-for-new-hono
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Env = {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	mediaBucket: R2Bucket
	hubSessionSecret: string
	mediaTokenSecret: MediaTokenSecretBase64
	planetscaleDbUrl: string
	appOrigin: string
	hubOrigin: string
	peerSyncPublicKey: string
	peerSyncPrivateKey: string
}
