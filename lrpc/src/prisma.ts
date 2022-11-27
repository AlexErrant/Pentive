import { Ulid } from "id128"
import { PrismaClient } from "@prisma/client"

export const prisma = new PrismaClient()

export function ulidStringToBuffer(id: string): Buffer {
  return ulidToBuffer(Ulid.fromCanonical(id))
}

export function ulidToBuffer(id: Ulid): Buffer {
  return Buffer.from(id.toRaw(), "hex")
}
