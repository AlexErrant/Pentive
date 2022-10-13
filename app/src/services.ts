import { clozeRegex, clozeTemplateRegex } from "./domain/cardHtml"

// the DI container
export const C = {
  clozeRegex,
  clozeTemplateRegex,
} as const

export type Ct = typeof C

export interface PluginExports {
  services: Partial<Ct>
}

export function register<K extends keyof Ct, V extends Ct[K]>(
  serviceName: K,
  serviceImpl: V
): void {
  C[serviceName] = serviceImpl
}
