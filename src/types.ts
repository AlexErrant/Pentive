import { DecorationSet, EditorView } from "prosemirror-view";
import { Node as PMNode, Schema } from "prosemirror-model";
import { EditorState, StateField } from "prosemirror-state";

export type ImagePluginState = DecorationSet;

export interface InsertImagePlaceholder {
  type: "add";
  pos: number;
  id: unknown;
}

export interface RemoveImagePlaceholder {
  type: "remove";
  id: unknown;
}

export type ImagePluginAction = InsertImagePlaceholder | RemoveImagePlaceholder;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ImagePluginSettings<T = any> {
  downloadImage?: (url: string) => Promise<string>;
  downloadPlaceholder?: (url: string, view: EditorView) => string;
  uploadFile: (file: File) => Promise<string>;
  deleteSrc: (src: string) => Promise<void>;
  hasTitle: boolean;
  extraAttributes: Record<string, string | null>;
  createOverlay: (
    node: PMNode,
    getPos: (() => number) | boolean,
    view: EditorView
  ) => Node | undefined;
  updateOverlay: (
    overlayRoot: Node,
    getPos: (() => number) | boolean,
    view: EditorView,
    node: PMNode
  ) => void;
  defaultTitle: string;
  defaultAlt: string;
  enableResize: boolean;
  isBlock: boolean;
  resizeCallback: (el: Element, updateCallback: () => void) => () => void;
  imageMargin: number;
  minSize: number;
  maxSize: number;
  scaleImage: boolean;
  createState: (pluginSettings: ImagePluginSettings) => StateField<T>;
  createDecorations: (state: EditorState) => DecorationSet;
  findPlaceholder: (state: EditorState, id: object) => number | undefined;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum imageAlign {
  left = "left",
  right = "right",
  center = "center",
  fullWidth = "fullWidth",
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum resizeDirection {
  top = "top",
  topRight = "topRight",
  right = "right",
  bottomRight = "bottomRight",
  bottom = "bottom",
  bottomLeft = "bottomLeft",
  left = "left",
  topLeft = "topLeft",
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum imagePluginClassNames {
  imageResizeBoxWrapper = "imageResizeBoxWrapper",
  imageResizeBoxCenter = "imageResizeBoxCenter",
  imageResizeBox = "imageResizeBox",
  imageResizeBoxControl = "imageResizeBoxControl",
  imagePluginRoot = "imagePluginRoot",
  imagePluginImg = "imagePluginImg",
}
