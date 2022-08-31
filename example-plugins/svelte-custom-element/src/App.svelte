<!--
  Reference: https://svelte.dev/docs#run-time-custom-element-api
  There's no way to disable the Shadow DOM: https://github.com/sveltejs/svelte/issues/1748
  lowTODO improve the build https://www.thisdot.co/blog/web-components-with-svelte
 -->

<svelte:options tag="pentive-nav" />

<script lang="ts">
  import type { NavLinkData } from "../../../app/src/custom-elements/contracts";
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
