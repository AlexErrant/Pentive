import { EditorState } from "@codemirror/state"
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
import { Cloze, NookId, RemoteTemplateId, Standard, getTemplate } from "shared"
import { JSX, onMount, Show, createSignal } from "solid-js"
import { RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"

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
  const { template } = useRouteData<typeof routeData>()
  let frontRef: HTMLDivElement | undefined
  let backRef: HTMLDivElement | undefined
  const [frontView, setFrontView] = createSignal<EditorView>()
  const [backView, setBackView] = createSignal<EditorView>()
  onMount(() => {
    setFrontView(
      new EditorView({
        parent: frontRef,
      })
    )
    setBackView(
      new EditorView({
        parent: backRef,
      })
    )
  })

  return (
    <main>
      <h1>Edit Template</h1>
      <Show
        when={template() != null && frontView() != null && backView() !== null}
      >
        <Show
          when={template()!.templateType.tag === "cloze"}
          fallback={standard(
            template()!.templateType as Standard,
            frontView()!,
            backView()!
          )}
        >
          {cloze(template()!.templateType as Cloze, frontView()!, backView()!)}
        </Show>
      </Show>
      <div ref={frontRef} />
      <div ref={backRef} />
    </main>
  )
}

function createEditorState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [
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
    ],
  })
}

function cloze(cloze: Cloze, frontView: EditorView, backView: EditorView) {
  frontView.setState(createEditorState(cloze.template.front))
  backView.setState(createEditorState(cloze.template.back))
  return ""
}

function standard(
  standard: Standard,
  frontView: EditorView,
  backView: EditorView
) {
  frontView.setState(createEditorState(standard.templates[0].front))
  backView.setState(createEditorState(standard.templates[0].back))
  return ""
}
