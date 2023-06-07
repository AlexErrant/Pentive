import { type Setter, type VoidComponent } from "solid-js"
import { Dynamic } from "solid-js/web"

const ExamplePlugin: VoidComponent<{
  count: number
  setCount: Setter<number>
  child: VoidComponent<{ count: number; setCount: Setter<number> }>
}> = (props) => {
  return (
    <div class="border rounded-lg p-1 m-1 border-gray-900">
      <h1>Example Plugin</h1>
      <button
        class="border rounded-lg px-2 mx-2 border-gray-900"
        onClick={() => props.setCount(props.count - 2)}
      >
        -2
      </button>
      <output>Count: {props.count}</output>
      <button
        class="border rounded-lg px-2 mx-2 border-gray-900"
        onClick={() => props.setCount(props.count + 2)}
      >
        +2
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
