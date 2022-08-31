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
