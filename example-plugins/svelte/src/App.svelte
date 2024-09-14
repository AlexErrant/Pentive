<script lang="ts">
  import type { NavLinkData } from "app/components/contracts"
  import NavItem from "./NavItem.svelte"
  export let navLinks: NavLinkData[]
</script>

<nav>
  <ul>
    {#each navLinks as navLink}
      <li>
        <NavItem navLink={navLink}/>
      </li>
    {/each}
  </ul>
</nav>

<style>
  :global a, :global a * {
    background: orange;
    color: white;
  }
  ul{
    align-items: center;
    display: flex;
  }
</style>
