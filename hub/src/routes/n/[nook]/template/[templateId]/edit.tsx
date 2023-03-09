import { EditorState, Transaction } from "@codemirror/state"
import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  lineNumbers,
  highlightActiveLineGutter,
} from "@codemirror/view"
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search"
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"
import { NookId, RemoteTemplateId, Template, getTemplate } from "shared"
import { JSX, onMount, Show, createSignal, createEffect, on } from "solid-js"
import { RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { html } from "@codemirror/lang-html"
import ResizingIframe from "~/components/resizingIframe"
import { ClozeTemplate, StandardTemplate } from "shared/src/cardHtml"
import { SetStoreFunction, createStore } from "solid-js/store"

interface TemplateStore {
  t: Template | undefined
}
interface ClozeTemplateStore {
  t: ClozeTemplate
}
interface StandardTemplateStore {
  t: StandardTemplate
}

export function routeData({ params }: RouteDataArgs) {
  return {
    template: createServerData$(
      async ([nook, templateId]) =>
        await getTemplate(templateId as RemoteTemplateId, nook as NookId),
      { key: () => [params.nook, params.templateId] }
    ),
  }
}

export default function Submit(): JSX.Element {
  const { template: templatePrime } = useRouteData<typeof routeData>()
  const [template, setTemplate] = createStore<TemplateStore>({
    t: templatePrime(),
  })
  const [i, setI] = createSignal<number>()
  let frontRef: HTMLDivElement | undefined
  let backRef: HTMLDivElement | undefined
  const [frontView, setFrontView] = createSignal<EditorView>()
  const [backView, setBackView] = createSignal<EditorView>()
  createEffect(
    on(
      i,
      (i) => {
        const { templateType: x } = template.t!
        if (x.tag === "standard") {
          frontView()!.setState(createEditorState(x.templates[i!].front))
          backView()!.setState(createEditorState(x.templates[i!].back))
        } else {
          frontView()!.setState(createEditorState(x.template.front))
          backView()!.setState(createEditorState(x.template.back))
        }
      },
      { defer: true }
    )
  )
  onMount(() => {
    setI(0) // highTODO add <select> or tabs or something
    setFrontView(
      new EditorView({
        parent: frontRef,
        dispatch: (tr) =>
          dispatch(tr, frontView()!, template, setTemplate, i()!),
      })
    )
    setBackView(
      new EditorView({
        parent: backRef,
        dispatch: (tr) =>
          dispatch(tr, backView()!, template, setTemplate, i()!),
      })
    )
  })

  return (
    <main>
      <h1>Edit Template</h1>
      <Show
        when={template.t != null && frontView() != null && backView() !== null}
      >
        <ResizingIframe
          i={{
            tag: "template",
            side: "front",
            template: template.t!,
            index: i()!,
          }}
        />
        <ResizingIframe
          i={{
            tag: "template",
            side: "back",
            template: template.t!,
            index: i()!,
          }}
        />
      </Show>
      <div ref={frontRef} />
      <div ref={backRef} />
    </main>
  )
}

// from https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
const basicSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
]

function dispatch(
  tr: Transaction,
  editorView: EditorView,
  template: TemplateStore,
  setTemplate: SetStoreFunction<TemplateStore>,
  i: number
) {
  if (editorView == null) return
  editorView.update([tr])
  if (tr.docChanged) {
    const newCode = tr.newDoc.sliceString(0, tr.newDoc.length)
    if (template.t!.templateType.tag === "cloze") {
      ;(setTemplate as SetStoreFunction<ClozeTemplateStore>)(
        "t",
        "templateType",
        "template",
        "front",
        newCode
      )
    } else {
      ;(setTemplate as SetStoreFunction<StandardTemplateStore>)(
        "t",
        "templateType",
        "templates",
        i,
        "front",
        newCode
      )
    }
  }
}

function createEditorState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [[...basicSetup], html()],
  })
}
