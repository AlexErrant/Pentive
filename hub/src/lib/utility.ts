import { type RemoteTemplate, type Template } from "shared"

export function remoteToTemplate(remote: RemoteTemplate): Template {
  return {
    ...remote,
    fields: remote.fields.map((name) => ({ name })),
    remotes: new Map([[remote.nook, remote.id]]),
  }
}
