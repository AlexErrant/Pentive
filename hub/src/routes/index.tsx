import { type Ord } from "shared"
import { type Template } from "shared/src/cardHtml"
import { type JSX, createSignal } from "solid-js"
import ResizingIframe from "~/components/resizingIframe"

export default function Home(): JSX.Element {
  const [template, setTemplate] = createSignal<Template>({
    css: "",
    fields: ["Front", "Back"],
    templateType: {
      tag: "standard",
      templates: [
        {
          id: 0 as Ord,
          name: "My Template",
          front: "{{Front}}",
          back: `{{FrontSide}}<hr id=answer>{{Back}}<img src="book.jpg" >`, // highTODO nix book.jpg
          shortFront: "{{Front}}",
          shortBack: "{{Back}}",
        },
      ],
    },
  })

  return (
    <main class="w-full p-4 space-y-2">
      <h3 class="font-bold text-xl">Message board</h3>
      <ResizingIframe
        i={{
          tag: "template",
          side: "back",
          template: template(),
          index: 0,
        }}
      />
      <ResizingIframe
        i={{
          tag: "card",
          side: "back",
          template: template(),
          ord: 0 as Ord,
          fieldsAndValues: [
            ["Front", "q"],
            ["Back", "a"],
          ],
        }}
      />
      <button
        onclick={() => {
          setTemplate((t) => {
            if (t.templateType.tag === "cloze") {
              return {
                ...t,
                templateType: {
                  ...t.templateType,
                  template: {
                    ...t.templateType.template,
                    front: `${t.templateType.template.front}!`,
                  },
                },
              }
            } else {
              return {
                ...t,
                templateType: {
                  ...t.templateType,
                  templates: t.templateType.templates.map((t, i) => {
                    if (i === 0) {
                      return {
                        ...t,
                        front: `${t.front}!`,
                      }
                    }
                    return t
                  }),
                },
              }
            }
          })
        }}
      >
        mutate!
      </button>
    </main>
  )
}
