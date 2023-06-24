import { defaultSettings } from "./defaults";
import imagePlugin from "./plugin/index";

import {
  type imageAlign,
  type ImagePluginSettings,
  type RemoveImagePlaceholder,
  type InsertImagePlaceholder,
  type ImagePluginAction,
  type ImagePluginState,
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
