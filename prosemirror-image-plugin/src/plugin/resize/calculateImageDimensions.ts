import { ImagePluginSettings } from "../../types";

export default (
  maxWidth: number,
  containerWidth: number,
  sourceWidth: number,
  sourceHeight: number,
  pluginSettings: ImagePluginSettings,
  nodeWidth?: number,
  nodeHeight?: number,
  nodeMaxWidth?: number
): { width: number; height: number } => {
  const aspectRatio =
    sourceWidth && sourceHeight ? sourceWidth / sourceHeight : 1;
  const scale =
    pluginSettings.scaleImage && nodeMaxWidth ? maxWidth / nodeMaxWidth : null;
  let width = scale && nodeWidth ? nodeWidth * scale : nodeWidth;
  let height = scale && nodeHeight ? nodeHeight * scale : nodeHeight;
  if (width && !height) {
    height = width / aspectRatio;
  } else if (height && !width) {
    width = height * aspectRatio;
  } else if (!width && !height) {
    width = sourceWidth;
    height = sourceHeight;
  }
  if (width && width > containerWidth) {
    // Scale image to fit its containing space.
    // If the image is not cropped.
    width = containerWidth;
    height = width / aspectRatio;
  }
  if (width === undefined || height === undefined)
    return { height: pluginSettings.minSize, width: pluginSettings.minSize };
  return {
    width,
    height,
  };
};
