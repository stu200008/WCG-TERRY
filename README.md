# WNACG plugin

A Kinoko v3 plugin for WNACG, with update, category sub-tabs for doujinshi, single-volume, and magazine/short stories, day/week/month/year ranking sub-tabs, search, in-app page reading, and the site's direct ZIP download URI. It resolves the active WNACG domain from the official address page at `https://wnlink.ru/`.

Each WNACG album is one book. Albums with multiple chapters keep those chapters separate, while single-volume albums use one chapter containing all image pages. Requests are queued and throttled, with automatic retries for HTTP 429. On the book page, the download icon opens the official archive URI when WNACG provides one.
