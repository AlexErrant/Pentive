# mediaBucket

Our R2 bucket that hosts user uploaded media. This is temporary; we should move to a cheaper option that sanitizes user input.

## highTODO

- Sanitize SVGs https://github.com/mattkrick/sanitize-svg https://github.com/cloudflare/svg-hush
- [pngcrush](https://en.wikipedia.org/wiki/Pngcrush) uploads to prevent [acropalypse](https://www.bleepingcomputer.com/news/microsoft/microsoft-fixes-acropalypse-privacy-bug-in-windows-11-snipping-tool/)
- Strip exif data
  - https://developers.cloudflare.com/workers/tutorials/generate-youtube-thumbnails-with-workers-and-images/ https://github.com/hMatoba/piexifjs https://github.com/hMatoba/exif-library
- Maybe compress or lossy encode?
- Maybe scan for viruses?
- `hub` should query `app` for media before hitting the network.

Research specialized 3rd party image/media hosting:

- Could combine [image resizing](https://developers.cloudflare.com/images/image-resizing/) with cheap storage like [Wasabi](https://wasabi.com/cloud-storage-pricing) or [B2](https://www.backblaze.com/b2/cloud-storage-pricing.html).
  - https://blog.cloudflare.com/building-cloudflare-images-in-rust-and-cloudflare-workers/
  - https://walshy.dev/blog/21_09_10-handling-file-uploads-with-cloudflare-workers
  - https://news.ycombinator.com/item?id=28687181
  - https://www.backblaze.com/blog/free-image-hosting-with-cloudflare-transform-rules-and-backblaze-b2/
  - https://news.ycombinator.com/item?id=29474743
- imgix
- Cloudinary
- Bunny.net
- cloudimage.io
- imgproxy.net
- gumlet.com
- sirv.com
- imagekit.io
- https://www.cloudflare.com/bandwidth-alliance

# CWA - Cloudflare Workers API

Hosts [tRPC](https://trpc.io/), connects to mediaBucket, and talks to PlanetScale. Could be called "API", i.e. `api.pentive.com`, but I'm leaving room for future APIs hosted on other platforms.

# tRPC on AWS Lambda

Mostly used for syncing user sqlite files with S3.

~~I'm (reluctantly) on AWS Lambda because CloudFlare Workers don't have filesystem access, which is necessary for reading/writing user sqlite dbs. (Reading/writing to memory then persisting to R2 is unreasonable because the memory limit on Workers is 128mb.) Each user will have their own isolated sqlite file which is persisted to S3. This negatively impacts Lambda perf because we must fetch the sqlite db from S3 for every sync, but that shouldn't be a problem with the size of sqlite files we're expecting. Users also shouldn't be syncing multiple times/sec - we'll probably rate limit to a few times/min or something.~~ Abandoning in favor of p2p syncing. May resurrect later.
