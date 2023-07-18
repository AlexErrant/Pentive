import {
  type RemoteNote,
  type Note,
  type RemoteTemplate,
  type Template,
} from "shared"

export function remoteToTemplate(remote: RemoteTemplate): Template {
  return {
    ...remote,
    fields: remote.fields.map((name) => ({ name })),
    remotes: new Map([
      [remote.nook, { remoteTemplateId: remote.id, uploadDate: new Date() }],
    ]),
  }
}

export function remoteToNote(remote: RemoteNote): Note {
  return {
    ...remote,
    remotes: new Map([[remote.nook, remote.id]]),
    tags: new Set(remote.tags),
  }
}
