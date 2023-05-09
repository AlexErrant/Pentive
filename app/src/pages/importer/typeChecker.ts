import { type Ord } from "shared"
import { z, type SafeParseReturnType } from "zod"

const tmpl = z.object({
  name: z.string(),
  ord: z.number(),
  qfmt: z.string(),
  afmt: z.string(),
  bqfmt: z.string(),
  bafmt: z.string(),
  did: z.number().nullable(),
})

const fld = z.object({
  name: z.string(),
  ord: z.number(),
  sticky: z.boolean(),
  rtl: z.boolean(),
  font: z.string(),
  size: z.number(),
  // media: z.array(z.unknown()),
})

const model = z.object({
  id: z.number(),
  name: z.string(),
  type: z.number(),
  mod: z.number(),
  usn: z.number(),
  sortf: z.number(),
  did: z.number().nullable(),
  tmpls: z.array(tmpl),
  flds: z.array(fld),
  css: z.string(),
  latexPre: z.string(),
  latexPost: z.string(),
  // latexsvg: z.boolean(),
  // req: z.array(z.unknown()),
  // tags: z.array(z.unknown()),
  // vers: z.array(z.unknown()),
})

const conf = z.object({
  estTimes: z.boolean(),
  // curModel: z.number(),
  activeDecks: z.array(z.number()),
  // schedVer: z.number(),
  newSpread: z.number(),
  addToCur: z.boolean(),
  sortType: z.string(),
  timeLim: z.number(),
  sortBackwards: z.boolean(),
  collapseTime: z.number(),
  dayLearnFirst: z.boolean(),
  dueCounts: z.boolean(),
  nextPos: z.number(),
  curDeck: z.number(),
})

const deck = z.object({
  id: z.number(),
  mod: z.number(),
  name: z.string(),
  usn: z.number(),
  lrnToday: z.tuple([z.number(), z.number()]),
  revToday: z.tuple([z.number(), z.number()]),
  newToday: z.tuple([z.number(), z.number()]),
  timeToday: z.tuple([z.number(), z.number()]),
  collapsed: z.boolean(),
  // browserCollapsed: z.boolean(),
  desc: z.string(),
  // dyn: z.number(),
  conf: z.number(),
  extendNew: z.number(),
  extendRev: z.number(),
})

const dconfSingle = z.object({
  id: z.number(),
  mod: z.number(),
  name: z.string(),
  usn: z.number(),
  maxTaken: z.number(),
  autoplay: z.boolean(),
  timer: z.number(),
  replayq: z.boolean(),
  new: z.object({
    bury: z.boolean(),
    delays: z.array(z.number()),
    initialFactor: z.number(),
    ints: z.array(z.number()),
    order: z.number(),
    perDay: z.number(),
  }),
  rev: z.object({
    bury: z.boolean(),
    ease4: z.number(),
    ivlFct: z.number(),
    maxIvl: z.number(),
    perDay: z.number(),
    hardFactor: z.number(),
  }),
  lapse: z.object({
    delays: z.array(z.number()),
    leechAction: z.number(),
    leechFails: z.number(),
    minInt: z.number(),
    mult: z.number(),
  }),
  // dyn: z.boolean(),
})

const dconf = z.record(z.string(), dconfSingle)

const col = z.object({
  id: z.number(),
  crt: z.number(),
  mod: z.number(),
  scm: z.number(),
  ver: z.number(),
  dty: z.number(),
  usn: z.number(),
  ls: z.number(),
  conf: z.string(),
  models: z.string(),
  decks: z.string(),
  dconf: z.string(),
  tags: z.string(),
})

const models = z.record(z.string(), model)
const decks = z.record(z.string(), deck)

type Col = z.infer<typeof col>
type Conf = z.infer<typeof conf>
type Dconf = z.infer<typeof dconf>
export type Models = z.infer<typeof models>
export type Model = z.infer<typeof model>
export type Fld = z.infer<typeof fld>
export type Tmpl = z.infer<typeof tmpl>
type Decks = z.infer<typeof decks>

type MergedCol = Omit<Col, "conf" | "decks" | "models" | "dconf"> & {
  conf: Conf
  models: Models
  decks: Decks
  dconf: Dconf
}

function parse<Input, Output>(
  z: { safeParse: (raw: unknown) => SafeParseReturnType<Input, Output> },
  raw: unknown
) {
  const result = z.safeParse(raw)
  if (result.success) {
    return result.data
  } else {
    console.error("Error parsing: ", raw)
    throw new Error(result.error.toString())
  }
}

export function checkCol(raw: initSqlJs.ParamsObject): MergedCol {
  const parsedCol = parse(col, raw)
  const parsedConf = parse(conf, JSON.parse(parsedCol.conf))
  const parsedModels = parse(models, JSON.parse(parsedCol.models))
  const parsedDecks = parse(decks, JSON.parse(parsedCol.decks))
  const parsedDconf = parse(dconf, JSON.parse(parsedCol.dconf))
  return {
    ...parsedCol,
    conf: parsedConf,
    models: parsedModels,
    decks: parsedDecks,
    dconf: parsedDconf,
  }
}

const note = z.object({
  id: z.number(),
  // guid: z.string(),
  mid: z.number(),
  mod: z.number(),
  // usn: z.number(),
  tags: z.string(),
  flds: z.string(),
  // sfld: z.string(),
  // csum: z.number(),
  // flags: z.number(),
  // data: z.string(),
})

const card = z.object({
  id: z.number(),
  nid: z.number(),
  did: z.number(),
  ord: z.number() as unknown as z.Schema<Ord>,
  mod: z.number(),
  // usn: z.number(),
  type: z.number(),
  queue: z.number(),
  due: z.number(),
  ivl: z.number(),
  factor: z.number(),
  reps: z.number(),
  lapses: z.number(),
  left: z.number(),
  odue: z.number(),
  // odid: z.number(),
  flags: z.number(),
  // data: z.string(),
})

export type Note = z.infer<typeof note>
export type Card = z.infer<typeof card>

export function checkNote(raw: initSqlJs.ParamsObject): Note {
  return note.parse(raw)
}

export function checkCard(raw: initSqlJs.ParamsObject): Card {
  return card.parse(raw)
}

export function checkMedia(raw: unknown): Record<string, string> {
  return z.record(z.string(), z.string()).parse(raw)
}
