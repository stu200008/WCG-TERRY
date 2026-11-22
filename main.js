const PER_PAGE = 20;
const SITE_URL = 'https://www.wnacg.com/';

class MainController extends Controller {

    load(data) {
        this.id = data.id;
        this.url = data.url;
        this.pageUrl = data.pageUrl;
        this.page = 0;

        let cached = this.readCache();
        if (cached && (!cached.items || cached.items.length === 0)) {
            cached = null;
        }

        this.data = {
            list: cached ? cached.items : [],
            loading: false,
            hasMore: true
        };

        if (!cached || new Date().getTime() - cached.time > 30 * 60 * 1000) {
            this.reload();
        }
    }

    async onPressed(index) {
        await this.navigateTo('book', {
            data: this.data.list[index]
        });
    }

    onRefresh() {
        this.reload();
    }

    makeURL(page) {
        if (page === 0) return this.url;
        return this.pageUrl.replace('{0}', page + 1);
    }

    async fetchPage(url) {
        let res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });
        return await res.text();
    }

    parseData(text, url) {
        let doc = HTMLParser.parse(text);
        let cards = doc.querySelectorAll('.gallary_wrap .gallary_item');
        let results = [];

        for (let card of cards) {
            let linkNode = card.querySelector('.info .title a') || card.querySelector('.pic_box a');
            let img = card.querySelector('.pic_box img');
            if (!linkNode || !img) continue;

            let link = linkNode.getAttribute('href');
            let picture = img.getAttribute('src') || img.getAttribute('data-src');
            if (!link || !picture) continue;

            let info = card.querySelector('.info_col');
            results.push({
                title: linkNode.getAttribute('title') || linkNode.text.trim(),
                link: new URL(link, url).toString(),
                picture: new URL(picture, url).toString(),
                pictureHeaders: {
                    Referer: SITE_URL
                },
                subtitle: info ? info.text.trim() : ''
            });
        }
        return results;
    }

    readCache() {
        let cache = localStorage['cache_' + this.id];
        if (cache) return JSON.parse(cache);
    }

    async reload() {
        this.setState(() => {
            this.data.loading = true;
        });
        try {
            let items = this.parseData(await this.fetchPage(this.makeURL(0)), this.url);
            if (items.length === 0) {
                throw new Error('No manga items found on the WNACG page');
            }
            this.page = 0;
            localStorage['cache_' + this.id] = JSON.stringify({
                time: new Date().getTime(),
                items: items
            });
            this.setState(() => {
                this.data.list = items;
                this.data.loading = false;
                this.data.hasMore = items.length >= PER_PAGE;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => {
                this.data.loading = false;
            });
        }
    }

    async onLoadMore() {
        this.setState(() => {
            this.data.loading = true;
        });
        try {
            let page = this.page + 1;
            let url = this.makeURL(page);
            let items = this.parseData(await this.fetchPage(url), url);
            this.page = page;
            this.setState(() => {
                for (let item of items) {
                    this.data.list.push(item);
                }
                this.data.loading = false;
                this.data.hasMore = items.length >= PER_PAGE;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => {
                this.data.loading = false;
            });
        }
    }
}

module.exports = MainController;
