import { Plugin } from "prosemirror-state";

import { ImagePluginSettings, ImagePluginState } from "../types";
import { imagePluginKey } from "../utils";
import dropHandler from "./dropHandler";
import imageNodeView from "./imageNodeView";
import pasteHandler from "./pasteHandler";

const imagePlugin = (
  pluginSettings: ImagePluginSettings
): Plugin<ImagePluginState> =>
  new Plugin({
    key: imagePluginKey,
    state: pluginSettings.createState(pluginSettings),
    props: {
      decorations: pluginSettings.createDecorations,
      handleDOMEvents: {
        paste: pasteHandler(pluginSettings),
        drop: dropHandler(pluginSettings),
      },
      nodeViews: {
        image: imageNodeView(pluginSettings),
      },
    },
  });

export default imagePlugin;
