<!--
  Reference: https://svelte.dev/docs#run-time-custom-element-api
  There's no way to disable the Shadow DOM: https://github.com/sveltejs/svelte/issues/1748
  lowTODO improve the build https://www.thisdot.co/blog/web-components-with-svelte
 -->

 <!--
  Change the tag's value below to `"pentive-nav"` to preview with `npm run dev`.
  I tried to register the component manually in a `preview.ts` script called from index.html,
  but I kept running into "Unrecoverable HMR error in <App>: next update will trigger a full reload"
  and ran out of time and patience. So you gotta change it manually for now.
  Don't forget to revert it back to `{null}` before `npm run build`. `null` is used to force
  you to register the component lazily and explicitly, as demonstrated in `index.ts`.
-->

<svelte:options tag={null} />

<script lang="ts">
  import type { NavLinkData } from "app/lib/src/customElements/contracts";
  export let navLinks: NavLinkData[] = [];
</script>

<nav>
  <ul>
    {#each navLinks as {name, href}}
      <li>
        <a href={href}>
          {name}
        </a>
      </li>
    {/each}
  </ul>
</nav>

<style>
  a {
    background: orange;
    color: white;
  }
</style>
