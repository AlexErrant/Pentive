<script lang="ts">
  import type { Accessor, Setter, VoidComponent } from "solid-js"
  import { Dynamic } from "solid-js/web"
  import { onMount } from "svelte"
  export let solidProps: {
    count: number
    setCount: Setter<number>
    child: VoidComponent<{ count: number; setCount: Setter<number> }>
  }
  export let count: number
  function times2() {
    count = count * 2
    solidProps.setCount(count)
  }
  function div2() {
    count = count / 2
    solidProps.setCount(count)
  }
  let placeholder: HTMLDivElement
  onMount(() => {
    const dynamic = Dynamic({
      get component() {
        return solidProps.child
      },
      get count() {
        return solidProps.count
      },
      get setCount() {
        return solidProps.setCount
      },
    }) as unknown as Accessor<Node> // https://github.com/solidjs/solid/issues/1763
    placeholder.replaceWith(dynamic())
  })
</script>

<!-- medTODO not sure why `border-orange-500` isn't working, figure out later when it's time to learn CSS. grep B4197330-831F-4CD8-84F1-0CF7AE2FA22F -->
<div
  class="border rounded-lg p-1 m-1 border-orange-500"
  style="border-color:orange"
>
  <h1>Svelte Plugin</h1>
  <button class="border rounded-lg px-2 mx-2 border-orange-500" on:click={div2}>
    /2
  </button>
  <output>Count: {count}</output>
  <button
    class="border rounded-lg px-2 mx-2 border-orange-500"
    on:click={times2}
  >
    *2
  </button>
  <div bind:this={placeholder} />
</div>
