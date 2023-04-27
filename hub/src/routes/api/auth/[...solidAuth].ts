import { SolidAuth, type SolidAuthConfig } from "@auth/solid-start"
import Discord from "@auth/core/providers/discord"
import Github from "@auth/core/providers/github"
import { redirect, type PageEvent } from "solid-start"
import type { EnvVars } from "~/env"

import {
  type AuthorizationServer,
  type Client,
  type WWWAuthenticateChallenge,
  authorizationCodeGrantRequest,
  isOAuth2Error,
  parseWwwAuthenticateChallenges,
  processAuthorizationCodeOAuth2Response,
  validateAuthResponse,
} from "oauth4webapi"

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

export const GET = async ({ env, request }: PageEvent) => {
  const as: AuthorizationServer = {
    issuer: "https://github.com/login/oauth/authorize",
    /* eslint-disable @typescript-eslint/naming-convention */
    token_endpoint: "https://github.com/login/oauth/access_token",
  }
  const client: Client = {
    client_id: env.githubId,
    client_secret: env.githubSecret,
    /* eslint-enable @typescript-eslint/naming-convention */
  }
  const parameters = validateAuthResponse(
    as,
    client,
    new URL(request.url).searchParams
  )
  if (isOAuth2Error(parameters)) {
    console.error(parameters)
    throw new Error(JSON.stringify(parameters))
  }
  const response = await authorizationCodeGrantRequest(
    as,
    client,
    parameters,
    "https://pentive.localhost:3014/api/auth/callback/github",
    "x"
  )

  let challenges: WWWAuthenticateChallenge[] | undefined
  if ((challenges = parseWwwAuthenticateChallenges(response)) != null) {
    for (const challenge of challenges) {
      console.log("challenge", challenge)
    }
    throw new Error() // Handle www-authenticate challenges as needed
  }

  const result = await processAuthorizationCodeOAuth2Response(
    as,
    client,
    response
  )
  if (isOAuth2Error(result)) {
    console.error(result)
    throw new Error(JSON.stringify(result))
  }

  // https://docs.github.com/en/rest/users/emails?apiVersion=2022-11-28#list-email-addresses-for-the-authenticated-user
  const res = await fetch("https://api.github.com/user/emails", {
    headers: {
      /* eslint-disable @typescript-eslint/naming-convention */
      Authorization: `Bearer ${result.access_token}`,
      "User-Agent": "AlexErrant/Pentive/Dev/Hub", // https://docs.github.com/en/rest/overview/resources-in-the-rest-api?apiVersion=2022-11-28#user-agent-required
      /* eslint-enable @typescript-eslint/naming-convention */
    },
  })

  const emails: GitHubEmail[] = await res.json()
  const email = emails.find((e) => e.primary && e.verified)?.email
  console.log("email is", email)
  return redirect("/")
}

export interface GitHubEmail {
  email: string
  primary: boolean
  verified: boolean
  visibility: "public" | "private"
}
