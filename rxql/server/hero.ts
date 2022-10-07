import { RxReplicationWriteToMasterRow } from "rxdb"
import _ from "lodash"
import express from "express"
import { authenticateRequest, log } from "./util"
import { graphQLGenerationInput, Hero } from "../shared"

let documents: Hero[] = []

type HeroCheckpoint = Pick<
  Hero,
  typeof graphQLGenerationInput.hero.checkpointFields[number]
>

function sortByUpdatedAtAndPrimary(a: Hero, b: Hero): 1 | 0 | -1 {
  if (a.updatedAt > b.updatedAt) return 1
  if (a.updatedAt < b.updatedAt) return -1

  if (a.updatedAt === b.updatedAt) {
    if (a.id > b.id) return 1
    if (a.id < b.id) return -1
    else return 0
  }
  throw Error("Impossible")
}

export const heroSync = {
  pullHero: (
    args: {
      checkpoint?: HeroCheckpoint
      limit: number
    },
    request: express.Request
  ): {
    checkpoint: HeroCheckpoint
    documents: Hero[]
  } => {
    log("## pullHero()")
    log(args)
    authenticateRequest(request)

    const lastId = args.checkpoint?.id ?? ""
    const minUpdatedAt = args.checkpoint?.updatedAt ?? 0

    // sorted by updatedAt and primary
    const sortedDocuments = documents.sort(sortByUpdatedAtAndPrimary)

    // only return where updatedAt >= minUpdatedAt
    const filterForMinUpdatedAtAndId = sortedDocuments.filter((doc) => {
      if (args.checkpoint == null) {
        return true
      }
      if (doc.updatedAt < minUpdatedAt) {
        return false
      }
      if (doc.updatedAt > minUpdatedAt) {
        return true
      }
      if (doc.updatedAt === minUpdatedAt) {
        if (doc.id > lastId) {
          return true
        } else {
          return false
        }
      }
      throw new Error("impossible")
    })

    // apply limit
    const limitedDocs = filterForMinUpdatedAtAndId.slice(0, args.limit)
    const last = _.last(limitedDocs)
    const ret = {
      documents: limitedDocs,
      checkpoint:
        last !== undefined
          ? {
              id: last.id,
              updatedAt: last.updatedAt,
            }
          : {
              id: lastId,
              updatedAt: minUpdatedAt,
            },
    }
    console.log("pullHero() ret:")
    console.log(JSON.stringify(ret, null, 4))
    return ret
  },
  pushHero: (
    args: { heroPushRow: Array<RxReplicationWriteToMasterRow<Hero>> },
    request: express.Request
  ): Hero[] => {
    log("## pushHero()")
    log(args)
    authenticateRequest(request)

    const rows = args.heroPushRow
    const lastCheckpoint = {
      id: "",
      updatedAt: 0,
    }

    const conflicts: Hero[] = []

    const writtenDocs: Hero[] = []
    rows.forEach((row: RxReplicationWriteToMasterRow<Hero>) => {
      const docId = row.newDocumentState.id
      const docCurrentMaster = documents.find((d) => d.id === docId)

      /**
       * Detect conflicts.
       */
      if (
        docCurrentMaster != null &&
        row.assumedMasterState != null &&
        docCurrentMaster.updatedAt !== row.assumedMasterState.updatedAt
      ) {
        conflicts.push(docCurrentMaster)
        return
      }

      const doc = row.newDocumentState
      documents = documents.filter((d) => d.id !== doc.id)
      documents.push(doc)

      lastCheckpoint.id = doc.id
      lastCheckpoint.updatedAt = doc.updatedAt
      writtenDocs.push(doc)
    })

    console.log("## current documents:")
    console.log(JSON.stringify(documents, null, 4))
    console.log("## conflicts:")
    console.log(JSON.stringify(conflicts, null, 4))

    return conflicts
  },
}
