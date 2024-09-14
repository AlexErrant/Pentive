<script lang="ts">
  import type { NavLinkData } from "app/components/contracts"
  import type { Accessor } from "solid-js"
  import { Dynamic } from "solid-js/web"
  import { A } from "@solidjs/router"
  import { onMount } from "svelte"

  export let navLink: NavLinkData

  let placeholder: HTMLDivElement

  onMount(() => {
    const dynamic = Dynamic({
      get component() {
        return () =>
          A({
            href: navLink.href,
            children:
              typeof navLink.child === "function"
                ? navLink.child()
                : navLink.child,
          })
      },
    }) as unknown as Accessor<Node> // https://github.com/solidjs/solid/issues/1763
    placeholder.replaceWith(dynamic())
  })
</script>

<div bind:this={placeholder} />
