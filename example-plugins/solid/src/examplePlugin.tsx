import { type Setter, type VoidComponent } from "solid-js"
import { Dynamic } from "solid-js/web"

const ExamplePlugin: VoidComponent<{
  count: number
  setCount: Setter<number>
  child: VoidComponent<{ count: number; setCount: Setter<number> }>
}> = (props) => {
  return (
    <div
      // medTODO not sure why `border-red-900` isn't working, figure out later when it's time to learn CSS. grep B4197330-831F-4CD8-84F1-0CF7AE2FA22F
      style={{ "border-color": "red" }}
      class="border rounded-lg p-1 m-1 border-red-900"
    >
      <h1>Example Solid Plugin</h1>
      <button
        class="border rounded-lg px-2 mx-2 border-red-900"
        onClick={() => props.setCount(props.count - 0.1)}
      >
        -0.1
      </button>
      <output>Count: {props.count}</output>
      {/* If the above isn't reactive, make sure `app` is running via `pnpm serve`
      (`external` doesn't work in dev https://github.com/vitejs/vite/issues/6582 https://github.com/vitejs/vite/issues/2483) */}
      <button
        class="border rounded-lg px-2 mx-2 border-red-900"
        onClick={() => props.setCount(props.count + 0.1)}
      >
        +0.1
      </button>
      <Dynamic
        component={props.child}
        count={props.count}
        setCount={props.setCount}
      />
    </div>
  )
}

export default ExamplePlugin
