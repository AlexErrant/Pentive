import { render } from "solid-js/web"
import ExamplePlugin from "./examplePlugin"
import { type VoidComponent, createSignal, type Setter } from "solid-js"
import { Nav } from "./nav"

const PluginChild: VoidComponent<{
  count: number
  setCount: Setter<number>
}> = (props) => {
  return (
    <div class="border rounded-lg p-1 m-1 border-gray-900">
      <h1>Component from App</h1>
      <button
        class="border rounded-lg px-2 mx-2 border-gray-900"
        onClick={() => props.setCount(props.count - 1)}
      >
        -
      </button>
      <output>Negative Count: {props.count * -1}</output>
      <button
        class="border rounded-lg px-2 mx-2 border-gray-900"
        onClick={() => props.setCount(props.count + 1)}
      >
        +
      </button>
    </div>
  )
}

render(() => {
  const [count, setCount] = createSignal(1)
  return (
    <>
      <Nav
        navLinks={[
          {
            name: "Home",
            href: "/",
          },
          {
            name: "About",
            href: "/about",
          },
          {
            name: "Templates",
            href: "/templates",
          },
          {
            name: "Plugins",
            href: "/plugins",
          },
          {
            name: "Error",
            href: "/error",
          },
        ]}
      />
      <ExamplePlugin count={count()} setCount={setCount} child={PluginChild} />
    </>
  )
}, document.getElementById("root")!)
