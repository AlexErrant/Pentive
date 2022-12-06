# tRPC on AWS Lambda

Mostly used for syncing user sqlite files with S3.

I'm (reluctantly) on AWS Lambda because CloudFlare Workers don't have filesystem access, which is necessary for reading/writing user sqlite dbs. (Reading/writing to memory then persisting to R2 is unreasonable because the memory limit on Workers is 128mb.) Each user will have their own isolated sqlite file which is persisted to S3. This negatively impacts Lambda perf because we must fetch the sqlite db from S3 for every sync, but that shouldn't be a problem with the size of sqlite files we're expecting. Users also shouldn't be syncing multiple times/sec - we'll probably rate limit to a few times/min or something.

# tRPC on CloudFlare Workers

Doesn't exist yet. Thinking about using it for PlanetScale queries - assuming we're okay with abandoning Prisma.
