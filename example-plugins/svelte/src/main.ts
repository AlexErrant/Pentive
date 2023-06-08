import "./app.css"
import App from "./App.svelte"
import { createRoot } from "solid-js"

const app = new App({
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  target: document.getElementById("app")!,
})

export default app

// import {
//   Component,
//   createComponent,
//   createRoot,
//   createSignal,
//   onCleanup
// } from 'solid-js';
// import { render } from 'solid-js/web';

// const Comp: Component<{ children: number }> = (props) => {
//   return () => props.children;
// };

// const App = () => {
//   let dispose: () => void;
//   const [count, setCount] = createSignal(0);
//   setInterval(() => setCount((p) => p + 1), 1000);

//   onCleanup(() => {
//     dispose && dispose();
//   });

//   const el = createRoot((disposer) => {
//     dispose = disposer;
//     return createComponent(Comp, {
//       get children() {
//         return count();
//       },
//     });
//   });

//   return <div>{el}</div>;
// };

// render(App, document.body);
