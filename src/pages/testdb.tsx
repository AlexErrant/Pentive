import { JSX } from "solid-js/jsx-runtime"
import _ from "lodash"

import * as rxdb from "../rxdb/rxdb"
import { Card, sampleCard } from "../domain/card"
import { defaultTemplate, Template } from "../domain/template"
import { createResource, Match, onMount, Switch } from "solid-js"

async function testTemplate(expected: Template): Promise<boolean> {
  const db = await rxdb.getDb()
  await rxdb.upsertTemplate(expected)
  const actual = await db.templates.getTemplate(expected.id)
  const r = _.isEqual(expected, actual)
  console.assert(r, { expected, actual })
  return r
}

async function testCard(expected: Card): Promise<boolean> {
  const db = await rxdb.getDb()
  await rxdb.upsertCard(expected)
  const actual = await db.cards.getCard(expected.id)
  const r = _.isEqual(expected, actual)
  console.assert(r, { expected, actual })
  return r
}

const [template] = createResource(defaultTemplate, testTemplate)
const [card] = createResource(sampleCard, testCard)

export default function TestDb(): JSX.Element {
  function testsPassed(): boolean | undefined {
    const statuses = [template(), card()]
    if (statuses.some((a) => a === undefined)) {
      return undefined
    }
    return statuses.every((element) => element === true)
  }

  return (
    <section class="text-gray-700 p-8">
      <h1 class="text-2xl font-bold">Test IndexedDB</h1>
      <p class="mt-4">
        This page exists to be the target of automated Playwright testing.
      </p>
      <p class="mt-4">It has no functionality relevant to users.</p>
      <p class="mt-4">
        It isn't great that users can view it, but I'm on a time crunch.
      </p>
      <Switch fallback={<p>Loading...</p>}>
        <Match when={testsPassed() === true}>
          <p>✔ Passed!</p>
        </Match>
        <Match when={testsPassed() === false}>
          <p>❌ failed!</p>
        </Match>
      </Switch>
    </section>
  )
}
