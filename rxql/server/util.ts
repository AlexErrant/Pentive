import express from "express"
import { JWT_BEARER_TOKEN } from "../shared"

export function log(msg: unknown): void {
  const prefix = "# GraphQL Server: "
  if (typeof msg === "string") {
    console.log(prefix + msg)
  } else {
    console.log(prefix + JSON.stringify(msg, null, 2))
  }
}

/**
 * Returns true if the request is authenticated
 * throws if not.
 * In a real world app you would parse and validate the bearer token.
 * @link https://graphql.org/graphql-js/authentication-and-express-middleware/
 */
export function authenticateRequest(request: express.Request): void {
  const authHeader = request.header("authorization")
  if (authHeader === undefined) throw new Error("not authenticated")
  const splitted = authHeader.split(" ")
  const token = splitted[1]
  validateBearerToken(token)
}

export function validateBearerToken(token: string): boolean {
  if (token === JWT_BEARER_TOKEN) {
    return true
  } else {
    console.log("token not valid " + token)
    throw new Error("not authenticated")
  }
}

// https://stackoverflow.com/a/58716315
export type DeepMutable<T> = T extends object
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T
export const deepMutable = <T>(t: T): DeepMutable<T> => t as DeepMutable<T>
