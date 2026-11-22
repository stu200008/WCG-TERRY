# WNACG plugin

A Kinoko v3 plugin for WNACG, with update, doujinshi, single-volume, and weekly ranking tabs, search, in-app page reading, and the site's direct ZIP download URI. It resolves the active WNACG domain from the official address page at `https://wnlink.ru/`.

Each WNACG album is one book. Albums with multiple chapters keep those chapters separate, while single-volume albums use one chapter containing all image pages. Requests are queued and throttled, with automatic retries for HTTP 429. On the book page, the download icon opens the official archive URI when WNACG provides one.
