import { defaultSettings } from "./defaults";
import imagePlugin from "./plugin/index";

import {
  imageAlign,
  ImagePluginSettings,
  RemoveImagePlaceholder,
  InsertImagePlaceholder,
  ImagePluginAction,
  ImagePluginState,
} from "./types";

import updateImageNode from "./updateImageNode";
import { startImageUpload, imagePluginKey } from "./utils";

export {
  updateImageNode,
  imageAlign,
  ImagePluginSettings,
  RemoveImagePlaceholder,
  InsertImagePlaceholder,
  ImagePluginAction,
  ImagePluginState,
  imagePlugin,
  startImageUpload,
  defaultSettings,
  imagePluginKey,
};
