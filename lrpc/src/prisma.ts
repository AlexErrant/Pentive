import type { Ulid } from "id128"
import id128 from "id128"
import { PrismaClient } from "@prisma/client"

const ulid = id128.Ulid

export const prisma = new PrismaClient()

export function ulidStringToBuffer(id: string): Buffer {
  return ulidToBuffer(ulid.fromCanonical(id))
}

export function ulidToBuffer(id: Ulid): Buffer {
  return Buffer.from(id.toRaw(), "hex")
}
