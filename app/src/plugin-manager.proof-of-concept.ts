interface Container {
  regex: () => string
  render: (i: string) => string
  unused: string
}

const container: Container = {
  regex: function (): string {
    return "base_regex"
  },
  render(this: Container, i: string): string {
    return `render_regex(${this.regex()}). Input(${i}).`
  },
  unused: "",
}

const plugin = (c: Container): Partial<Container> => {
  return {
    regex: () => {
      return `plugin's regex(${c.regex()})`
    },
    render: function (i) {
      return c.render.bind(this)(i).toUpperCase() // the `bind(this)` is very important!
    },
  }
}

console.log(container.render("ordinary behavior"))
const containerResolved = {
  ...container,
  ...plugin(container),
}
console.log(containerResolved.render("plugin behavior"))
