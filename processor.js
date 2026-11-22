const bookFetch = require('./book_fetch');
const rateLimitedFetch = require('./network');

class WnacgProcessor extends Processor {

    get key() {
        return this.data.link;
    }

    async load(state) {
        this.loading = true;
        try {
            let pages = this.data.pages;
            if (!pages || pages.length === 0) {
                throw new Error('No image pages found in this WNACG chapter');
            }

            let images = [];
            for (let start = 0; start < pages.length; start += 8) {
                let batch = [];
                for (let i = start; i < start + 8 && i < pages.length; ++i) {
                    batch.push((async function(page) {
                        let text = await rateLimitedFetch(page.link, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                                'Referer': 'https://www.wnacg.com/'
                            }
                        });
                        let doc = HTMLParser.parse(text);
                        let img = doc.querySelector('#picarea');
                        let src = img && (img.getAttribute('src') || img.getAttribute('data-src'));
                        if (!src) throw new Error(`Could not find the full-size image at ${page.link}`);
                        return {
                            url: new URL(src, page.link).toString(),
                            headers: {
                                Referer: 'https://www.wnacg.com/',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                            }
                        };
                    })(pages[i]));
                }
                let loaded = await Promise.all(batch);
                for (let image of loaded) images.push(image);
                this.setData(images);
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
        let data = await bookFetch(this.data.link, false, false);
        let item = data.list[data.list.length - 1];
        return {
            title: item.title,
            key: item.link
        };
    }
}

module.exports = WnacgProcessor;
