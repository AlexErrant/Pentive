<script lang="ts">
  import type { NavLinkData } from "app/lib/src/components/contracts"
  export let navLinks: NavLinkData[] = []
</script>

<nav>
  <ul>
    {#each navLinks as { child, href }}
      <li>
        <a {href}>
          {child} 
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
