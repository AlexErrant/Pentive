# Problem Statement

PlanetScale (PS) and R2's mediaBucket may get out of sync. PS needs to store mediaIds for easy lookups, while R2 is object storage. We can either first write to PS then R2, or vice versa. Let's not do distributed transactions.

Grep BC34B055-ECB7-496D-9E71-58EE899A11D1

# PS -> R2

Could be in PS, but not R2

## Con: "lies" in PS

Will need to HEAD R2 objects during upload then upload - or make upload an upsert. Either will occur a cost on each upload.

# R2 -> PS

Could be in R2, but not PS

## Con: "orphaned" objects in R2

Could mitigate via `ListObjectsV2` (which returns at max 1000 keys) and compare with PS ($1 per billion reads). Storage is $0.015 / GB-month. 500 orphaned objects = 1gb (at worst). Listing 1 billion objects is $4.50 - listing 1 million objects is $0.00450.

This likely will be self-mitigated because users will try to upload the same object again.

# Conclusion

`R2 -> PS` is better, based on gut feel.
