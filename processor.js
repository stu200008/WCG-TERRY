const bookFetch = require('./book_fetch');

class WnacgProcessor extends Processor {

    get key() {
        return this.data.link;
    }

    async load(state) {
        try {
            let url = this.data.link;
            let res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Referer': 'https://www.wnacg.com/'
                }
            });
            let doc = HTMLParser.parse(await res.text());
            let img = doc.querySelector('#picarea');
            let src = img && (img.getAttribute('src') || img.getAttribute('data-src'));
            if (!src) throw new Error('Could not find the full-size image on the WNACG page');

            this.setData([{
                url: new URL(src, url).toString(),
                headers: { Referer: 'https://www.wnacg.com/' }
            }]);
            this.save(true, state);
        } catch (e) {
            console.log(`WNACG image load failed: ${e}\n${e.stack}`);
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
