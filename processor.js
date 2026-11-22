const bookFetch = require('./book_fetch');
const rateLimitedFetch = require('./network');
const site = require('./site');

class WnacgProcessor extends Processor {

    get key() {
        return `${this.data.link}:image-list-v1`;
    }

    async load(state) {
        this.loading = true;
        try {
            let albumUrl = await site.normalizeUrl(this.data.link);
            let referer = `${new URL(albumUrl).origin}/`;
            let pages = this.data.pages;
            if (!pages || pages.length === 0) {
                throw new Error('No image pages found in this WNACG chapter');
            }

            let directImages = pages.every(page =>
                page &&
                typeof page.url === 'string' &&
                page.url.length > 0
            );
            let images = [];

            if (directImages) {
                for (let page of pages) {
                    images.push({
                        url: new URL(page.url, albumUrl).toString(),
                        headers: {
                            Referer: referer,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                        }
                    });
                }
                this.setData(images);
            } else {
                for (let i = 0; i < pages.length; ++i) {
                    let page = pages[i];
                    if (!page || typeof page.link !== 'string' || page.link.length === 0) {
                        throw new Error(`Invalid WNACG image page at index ${i + 1}`);
                    }
                    let pageUrl = await site.normalizeUrl(page.link);

                    let text = await rateLimitedFetch(pageUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                            'Referer': referer
                        }
                    });
                    let doc = HTMLParser.parse(text);
                    let img = doc.querySelector('#picarea');
                    let src = img && (img.getAttribute('src') || img.getAttribute('data-src'));
                    if (!src) throw new Error(`Could not find the full-size image at ${pageUrl}`);
                    images.push({
                        url: new URL(src, pageUrl).toString(),
                        headers: {
                            Referer: referer,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                        }
                    });
                    this.setData(images);
                }
            }
            this.save(true, state);
        } catch (e) {
            console.log(`WNACG chapter load failed: ${e}\n${e.stack}`);
            showToast(`${e}`);
        } finally {
            this.loading = false;
        }
    }

    unload() {
    }

    async checkNew() {
        let url = await site.normalizeUrl(this.data.link);
        let data = await bookFetch(url, false, false);
        let item = data.list[data.list.length - 1];
        return {
            title: item.title,
            key: item.link
        };
    }
}

module.exports = WnacgProcessor;
