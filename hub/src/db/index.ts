const users = [{ id: 0, username: "kody", password: "twixrox" }]
export const db = {
  user: {
    // eslint-disable-next-line @typescript-eslint/require-await
    async create({
      data,
    }: {
      data: { username: string; password: string }
    }): Promise<{ id: number; username: string; password: string }> {
      const user = { ...data, id: users.length }
      users.push(user)
      return user
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async findUnique({
      where: { username = undefined, id = undefined },
    }: {
      where: { username?: string; id?: number }
    }): Promise<
      { id: number; username: string; password: string } | undefined
    > {
      if (id !== undefined) {
        return users.find((user) => user.id === id)
      } else {
        return users.find((user) => user.username === username)
      }
    },
  },
}
