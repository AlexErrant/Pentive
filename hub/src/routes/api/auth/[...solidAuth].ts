import { SolidAuth, type SolidAuthConfig } from "@auth/solid-start"
import Discord from "@auth/core/providers/discord"
import Github from "@auth/core/providers/github"
import type { PageEvent } from "solid-start"
import type { EnvVars } from "~/env"

export function authOpts(env: EnvVars): SolidAuthConfig {
  return {
    secret: env.authJsSecret,
    trustHost: true,
    providers: [
      // @ts-expect-error https://github.com/nextauthjs/next-auth/issues/6174c
      Discord({
        clientId: env.discordId,
        clientSecret: env.discordSecret,
      }),
      // @ts-expect-error https://github.com/nextauthjs/next-auth/issues/6174c
      Github({
        clientId: env.githubId,
        clientSecret: env.githubSecret,
      }),
    ],
    debug: false,
  }
}

export const GET = async (x: PageEvent) =>
  await SolidAuth(authOpts(x.env)).GET(x)

export const POST = async (x: PageEvent) =>
  await SolidAuth(authOpts(x.env)).POST(x)
