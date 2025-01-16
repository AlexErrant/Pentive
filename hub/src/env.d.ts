// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="@cloudflare/workers-types" />

import type {
	Request as CfRequest,
	ExecutionContext,
} from '@cloudflare/workers-types'
import { type PublicMediaSecretBase64 } from 'shared-edge'
import { type Base64 } from 'shared/brand'

export interface EnvVars {
	tursoDbUrl: string
	tursoAuthToken: string
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
	publicMediaSecret: PublicMediaSecretBase64
}

declare global {
	interface Env extends EnvVars {}
}

declare module 'vinxi/http' {
	interface H3EventContext {
		cf: CfRequest['cf']
		cloudflare?: {
			request: CfRequest
			env: EnvVars
			context: ExecutionContext
		}
	}
}
