import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Node as PMNode } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { imageAlign, ImagePluginAction, ImagePluginSettings } from "./types";
import { generateChangeAlignment, imagePluginKey } from "./utils";

export const defaultDeleteSrc = () => Promise.resolve();

export const defaultUploadFile = (file: File): Promise<string> =>
  new Promise((res) =>
    setTimeout(() => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const { result } = reader;

        if (result) {
          res(result.toString());
        }
      });
      reader.readAsDataURL(file);
    }, 200)
  );

export const defaultExtraAttributes = {
  align: imageAlign.center,
  width: null,
  height: null,
  maxWidth: null,
};

export const defaultCreateOverlay = () => {
  const overlay = document.createElement("div");
  overlay.className = "imagePluginOverlay";
  const alignLeft = document.createElement("button");
  alignLeft.className = "alignLeftButton";
  const alignRight = document.createElement("button");
  alignRight.className = "alignRightButton";
  const alignCenter = document.createElement("button");
  alignCenter.className = "alignCenterButton";
  const alignFullWidth = document.createElement("button");
  alignFullWidth.className = "alignFullWidthButton";

  alignLeft.textContent = imageAlign.left;
  alignLeft.setAttribute("imagealign", imageAlign.left);
  alignRight.textContent = imageAlign.right;
  alignRight.setAttribute("imagealign", imageAlign.right);
  alignCenter.textContent = imageAlign.center;
  alignCenter.setAttribute("imagealign", imageAlign.center);
  alignFullWidth.textContent = imageAlign.fullWidth;
  alignFullWidth.setAttribute("imagealign", imageAlign.fullWidth);

  overlay.appendChild(alignLeft);
  overlay.appendChild(alignRight);
  overlay.appendChild(alignCenter);
  overlay.appendChild(alignFullWidth);

  return overlay;
};

export const defaultUpdateOverlay = (
  overlay: Node,
  getPos: (() => number) | boolean,
  view: EditorView,
  node: PMNode
) => {
  if (overlay instanceof HTMLDivElement) {
    Object.values(imageAlign).map((align) => {
      const targetButton = overlay.querySelector(`button[imagealign=${align}]`);
      if (targetButton instanceof HTMLButtonElement) {
        targetButton.onclick = generateChangeAlignment(
          align,
          getPos,
          view,
          node
        );
      }
      return null;
    });
  }
};

export const defaultResizeCallback = (
  el: Element,
  updateCallback: () => void
) => {
  const observer = new ResizeObserver(() => updateCallback());
  observer.observe(el);
  return () => {
    observer.unobserve(el);
  };
};

export const defaultCreateDecorations = (state: EditorState) =>
  imagePluginKey.getState(state) || DecorationSet.empty;

const defaultFindPlaceholder = (state: EditorState, id: object) => {
  const decos = imagePluginKey.getState(state);
  const found = decos?.find(undefined, undefined, (spec) => spec.id === id);
  return found?.length ? found[0].from : undefined;
};

const defaultCreateState = () => ({
  init() {
    return DecorationSet.empty;
  },
  apply(tr: Transaction, value: DecorationSet): DecorationSet {
    let set = value.map(tr.mapping, tr.doc);
    const action: ImagePluginAction = tr.getMeta(imagePluginKey);
    if (action?.type === "add") {
      const widget = document.createElement("placeholder");
      const deco = Decoration.widget(action.pos, widget, {
        id: action.id,
      });
      set = set.add(tr.doc, [deco]);
    } else if (action?.type === "remove") {
      set = set.remove(
        set.find(undefined, undefined, (spec) => spec.id === action.id)
      );
    }
    return set;
  },
});

export const defaultSettings: ImagePluginSettings = {
  uploadFile: defaultUploadFile,
  hasTitle: true,
  deleteSrc: defaultDeleteSrc,
  extraAttributes: defaultExtraAttributes,
  createOverlay: defaultCreateOverlay,
  updateOverlay: defaultUpdateOverlay,
  defaultTitle: "Image title",
  defaultAlt: "Image",
  enableResize: true,
  isBlock: true,
  resizeCallback: defaultResizeCallback,
  imageMargin: 50,
  minSize: 50,
  maxSize: 2000,
  scaleImage: true,
  createState: defaultCreateState,
  createDecorations: defaultCreateDecorations,
  findPlaceholder: defaultFindPlaceholder,
};
