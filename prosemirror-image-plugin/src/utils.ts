import { PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node as PMNode, Schema } from "prosemirror-model";
import {
  imageAlign,
  ImagePluginSettings,
  ImagePluginState,
  InsertImagePlaceholder,
  RemoveImagePlaceholder,
} from "./types";

export const dataURIToFile = (dataURI: string, name: string) => {
  const arr = dataURI.split(",");
  const mime = arr[0]?.match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  // eslint-disable-next-line no-plusplus
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], name, { type: mime });
};

export const imagePluginKey = new PluginKey<ImagePluginState>("imagePlugin");

export const startImageUpload = (
  view: EditorView,
  file: File,
  alt: string,
  pluginSettings: ImagePluginSettings,
  schema: Schema,
  pos?: number
) => {
  // A fresh object to act as the ID for this upload
  const id = {};

  // Replace the selection with a placeholder
  const { tr } = view.state;
  if (!tr.selection.empty && !pos) tr.deleteSelection();
  const imageMeta: InsertImagePlaceholder = {
    type: "add",
    pos: pos || tr.selection.from,
    id,
  };
  tr.setMeta(imagePluginKey, imageMeta);
  view.dispatch(tr);

  pluginSettings.uploadFile(file).then(
    (url) => {
      const placholderPos = pluginSettings.findPlaceholder(view.state, id);
      // If the content around the placeholder has been deleted, drop
      // the image
      if (placholderPos == null) return;
      // Otherwise, insert it at the placeholder's position, and remove
      // the placeholder
      const removeMeta: RemoveImagePlaceholder = { type: "remove", id };
      view.dispatch(
        view.state.tr
          .insert(
            placholderPos,
            schema.nodes.image.create(
              { src: url, alt },
              pluginSettings.hasTitle
                ? schema.text(pluginSettings.defaultTitle)
                : undefined
            )
          )
          .setMeta(imagePluginKey, removeMeta)
      );
    },
    () => {
      const removeMeta: RemoveImagePlaceholder = { type: "remove", id };
      // On failure, just clean up the placeholder
      view.dispatch(tr.setMeta(imagePluginKey, removeMeta));
    }
  );
};

export const generateChangeAlignment =
  (
    align: imageAlign,
    getPos: (() => number) | boolean,
    view: EditorView,
    node: PMNode
  ) =>
  () => {
    const pos = typeof getPos === "function" ? getPos() : 0;
    const t = view.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      align,
    });
    view.dispatch(t);
  };

export const clamp = (min: number, value: number, max: number) =>
  Math.max(Math.min(max, value), min);
