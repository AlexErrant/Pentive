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
    remotes: new Map([[remote.nook, remote.id]]),
  }
}

export function remoteToNote(remote: RemoteNote): Note {
  return {
    ...remote,
    remotes: new Map(), // nextTODO
    tags: new Set(remote.tags),
  }
}
