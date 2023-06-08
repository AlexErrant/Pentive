<script lang="ts">
  import type { NavLinkData } from "app/lib/src/components/contracts"
  export let navLinks: NavLinkData[] = []
</script>

<nav>
  <ul>
    {#each navLinks as { name, href }}
      <li>
        <a {href}>
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
