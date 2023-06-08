<script lang="ts">
  import type { NavLinkData } from "app/lib/src/customElements/contracts"
  import Nav from "./Nav.svelte"
  import ExamplePlugin from "./ExamplePlugin.svelte"
  import { createSignal } from "solid-js"
  import { PluginChild } from "./PluginChild"
  const [count, setCount] = createSignal(1)
</script>

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

<ExamplePlugin
  count={11}
  solidProps={{
    get count() {
      console.log("gotten", count())
      return count()
    },
    get setCount() {
      console.log("set", count())
      return setCount
    },
    child: PluginChild,
  }}
/>
