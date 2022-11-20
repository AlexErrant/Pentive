interface Container {
  regex: () => string
  render: (i: string) => string
  unused: string
}

const container: Container = {
  regex(): string {
    return "base_regex"
  },
  render(this: Container, i: string): string {
    return `base_render(${this.regex()}). Input(${i}).`
  },
  unused: "",
}

const plugin = (c: Container): Partial<Container> => {
  return {
    regex: () => {
      return `plugin_regex(${c.regex()})`
    },
    render: function (i) {
      return `plugin_render(${c.render.bind(this)(i)})`
      // The `bind(this)` is very important! In the original container, `render` has a dependency on `regex` (L12).
      // The plugin's render (L22) calls the container's  `render` (L23) which in turn calls the container's `regex` (L12).
      // This is not desirable! The plugin defines its own `regex` (L19). The plugin author wants the original container
      // to call the plugin's implementation of `regex` (which may or may not call the container's `regex`).
      // `bind(this)` accomplishes this goal.
      // See `src\plugin-manager.excalidraw.svg` for a diagram with dependency arrows.
    },
  }
}

console.log(container.render("ordinary behavior")) // base_render(base_regex). Input(ordinary behavior).
const containerResolved = {
  ...container,
  ...plugin(container),
}
console.log(containerResolved.render("plugin behavior")) // plugin_render(base_render(plugin_regex(base_regex)). Input(plugin behavior).)
// without `bind(this)`, the above console.log yields       plugin_render(base_render(base_regex). Input(plugin behavior).)
