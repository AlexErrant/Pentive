export interface Plugin {
  readonly name: string
  readonly id: string
  readonly created: string
  readonly modified: string
  readonly script: Blob
}
