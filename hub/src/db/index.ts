const users = [{ username: "kody", password: "twixrox" }]
export const db = {
  user: {
    // eslint-disable-next-line @typescript-eslint/require-await
    async create({
      data,
    }: {
      data: { username: string; password: string }
    }): Promise<{ username: string; password: string }> {
      const user = { ...data, id: users.length }
      users.push(user)
      return user
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async findUnique({
      where: { username },
    }: {
      where: { username: string }
    }): Promise<{ username: string; password: string } | undefined> {
      return users.find((user) => user.username === username)
    },
  },
}
