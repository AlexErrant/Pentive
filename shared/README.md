# How to update `database.ts`

1. Spin up a mysql docker container

```sh
docker run -p 3306:3306 --name mysql2 -e MYSQL_ROOT_PASSWORD=super_secure_password -e MYSQL_ROOT_HOST=% -d mysql/mysql-server:latest
```

2. In `lrpc`, run `npx prisma db push`

3. Copy the DDL from PlanetScale to the docker container's mysql (use DataGrip or whatever). Use `schema_name` as the schema.

4. In `shared`, run

```sh
npx kysely-codegen --out-file './src/database.ts' --url "mysql://root:super_secure_password@localhost/schema_name"
```
