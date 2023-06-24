import { Node } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import {
  imagePluginClassNames,
  ImagePluginSettings,
  resizeDirection,
} from "../../types";
import { resizeFunctions, setSize } from "./utils";
import { clamp } from "../../utils";

const createMouseDownHandler =
  (
    direction: resizeDirection,
    wrapper: HTMLDivElement,
    resizeControl: HTMLSpanElement,
    getPos: boolean | (() => number),
    node: Node,
    view: EditorView,
    image: HTMLImageElement,
    setResizeActive: (value: boolean) => void,
    maxWidth: number,
    pluginSettings: ImagePluginSettings
  ) =>
  (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setResizeActive(true);
    wrapper.classList.add(direction);
    wrapper.classList.add("active");
    const originX = event.clientX;
    const originY = event.clientY;
    const initialWidth = wrapper.clientWidth;
    const initialHeight = wrapper.clientHeight;
    const aspectRatio = initialWidth / initialHeight;
    const mouseMoveListener = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const updateImageSize = () => {
        const doubleScale =
          node.attrs.align === "center" &&
          direction !== resizeDirection.top &&
          direction !== resizeDirection.bottom;
        const dx =
          (originX - ev.clientX) *
          (/left/i.test(direction) ? 1 : -1) *
          (doubleScale ? 2 : 1);
        const dy =
          (originY - ev.clientY) *
          (/top/i.test(direction) ? 1 : -1) *
          (doubleScale ? 2 : 1);
        let widthUpdate = clamp(
          pluginSettings.minSize,
          Math.round(initialWidth + dx),
          maxWidth
        );
        let heightUpdate = clamp(
          pluginSettings.minSize,
          Math.round(initialHeight + dy),
          pluginSettings.maxSize
        );
        const resizeFunction = resizeFunctions[direction];
        if (resizeFunction === setSize) {
          heightUpdate = Math.max(
            widthUpdate / aspectRatio,
            pluginSettings.minSize
          );
          widthUpdate = heightUpdate * aspectRatio;
        }
        const parent = wrapper.parentElement;
        if (!parent) return;
        resizeFunction(image, widthUpdate, heightUpdate);
        resizeFunction(parent, widthUpdate, heightUpdate);
        resizeFunction(wrapper, widthUpdate, heightUpdate);
      };
      requestAnimationFrame(updateImageSize);
    };
    document.addEventListener("mousemove", mouseMoveListener);
    document.addEventListener(
      "mouseup",
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setResizeActive(false);
        document.removeEventListener("mousemove", mouseMoveListener);
        wrapper.classList.remove(direction);
        wrapper.classList.remove("active");
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (!pos) return;
        const currentNode = view.state.doc.nodeAt(getPos());
        if (currentNode?.type.name !== "image") {
          return;
        }
        const attrs = {
          ...currentNode.attrs,
          width: wrapper.clientWidth,
          height: wrapper.clientHeight,
          maxWidth,
        };
        const tr = view.state.tr.setNodeMarkup(pos, undefined, attrs);
        view.dispatch(tr);
      },
      { once: true }
    );
  };

const createResizeControl = (
  wrapper: HTMLDivElement,
  direction: resizeDirection,
  getPos: boolean | (() => number),
  node: Node,
  view: EditorView,
  image: HTMLImageElement,
  setResizeActive: (value: boolean) => void,
  maxWidth: number,
  pluginSettings: ImagePluginSettings
) => {
  const resizeControl = document.createElement("span");
  resizeControl.className = `${imagePluginClassNames.imageResizeBoxControl} ${direction}`;
  resizeControl.addEventListener(
    "mousedown",
    createMouseDownHandler(
      direction,
      wrapper,
      resizeControl,
      getPos,
      node,
      view,
      image,
      setResizeActive,
      maxWidth,
      pluginSettings
    )
  );
  wrapper.appendChild(resizeControl);
};

export default (
  height: number,
  width: number,
  getPos: boolean | (() => number),
  node: Node,
  view: EditorView,
  image: HTMLImageElement,
  setResizeActive: (value: boolean) => void,
  maxWidth: number,
  pluginSettings: ImagePluginSettings
) => {
  const controlsWrapper = document.createElement("div");
  controlsWrapper.className = imagePluginClassNames.imageResizeBoxWrapper;
  const centeredWrapper = document.createElement("div");
  controlsWrapper.appendChild(centeredWrapper);
  centeredWrapper.className = imagePluginClassNames.imageResizeBoxCenter;
  centeredWrapper.style.height = `${height}px`;
  centeredWrapper.style.width = `${width}px`;
  const controlsRoot = document.createElement("div");
  centeredWrapper.appendChild(controlsRoot);
  controlsRoot.className = imagePluginClassNames.imageResizeBox;
  controlsRoot.style.height = `${height}px`;
  controlsRoot.style.width = `${width}px`;
  (Object.keys(resizeDirection) as Array<keyof typeof resizeDirection>).map(
    (direction) =>
      createResizeControl(
        controlsRoot,
        resizeDirection[direction],
        getPos,
        node,
        view,
        image,
        setResizeActive,
        maxWidth,
        pluginSettings
      )
  );
  return controlsWrapper;
};
