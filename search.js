const SITE_URL = 'https://www.wnacg.com/';
const SEARCH_URL = 'https://www.wnacg.com/search/index.php?q={0}&m=&syn=yes&f=_all&s=create_time_DESC';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const rateLimitedFetch = require('./network');

class SearchController extends Controller {

    load() {
        let hints = [];
        let saved = localStorage['hints'];
        if (saved) {
            let parsed = JSON.parse(saved);
            if (parsed && parsed.push) hints = parsed;
        }
        this.data = {
            list: [],
            focus: false,
            hints: hints,
            text: '',
            loading: false,
            hasMore: false
        };
    }

    makeURL(text) {
        return SEARCH_URL.replace('{0}', encodeURIComponent(text));
    }

    onSearchClicked() {
        this.findElement('input').submit();
    }

    onTextChange(text) {
        this.data.text = text;
    }

    onTextFocus() {
        this.setState(() => {
            this.data.focus = true;
        });
    }

    onTextBlur() {
        this.setState(() => {
            this.data.focus = false;
        });
    }

    async onTextSubmit(text) {
        if (!text || text.trim().length === 0) return;
        text = text.trim();
        let hints = this.data.hints;
        if (hints.indexOf(text) < 0) {
            hints.unshift(text);
            while (hints.length > 30) hints.pop();
            localStorage['hints'] = JSON.stringify(hints);
        }

        this.setState(() => {
            this.data.loading = true;
        });
        try {
            let result = await this.request(this.makeURL(text), 2);
            this.key = text;
            this.page = 1;
            this.nextURL = result.nextUrl;
            this.setState(() => {
                this.data.list = result.items;
                this.data.loading = false;
                this.data.hasMore = !!this.nextURL;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => {
                this.data.loading = false;
            });
        }
    }

    async onPressed(index) {
        await this.navigateTo('book', {
            data: this.data.list[index]
        });
    }

    onHintPressed(index) {
        let hint = this.data.hints[index];
        if (hint) {
            this.setState(() => {
                this.data.text = hint;
                this.findElement('input').blur();
                this.onTextSubmit(hint);
            });
        }
    }

    async request(url, nextPage) {
        let text = await rateLimitedFetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });
        let doc = HTMLParser.parse(text);
        let cards = doc.querySelectorAll('.gallary_wrap .gallary_item');
        let items = [];
        for (let card of cards) {
            let linkNode = card.querySelector('.info .title a') || card.querySelector('.pic_box a');
            let img = card.querySelector('.pic_box img');
            if (!linkNode || !img) continue;
            let link = linkNode.getAttribute('href');
            let picture = img.getAttribute('src') || img.getAttribute('data-src');
            if (!link || !picture) continue;
            let info = card.querySelector('.info_col');
            items.push({
                title: linkNode.getAttribute('title') || linkNode.text.trim(),
                link: new URL(link, url).toString(),
                picture: new URL(picture, url).toString(),
                pictureHeaders: {
                    Referer: SITE_URL,
                    'User-Agent': USER_AGENT
                },
                subtitle: info ? info.text.trim() : ''
            });
        }

        let nextUrl = null;
        for (let anchor of doc.querySelectorAll('a')) {
            let href = anchor.getAttribute('href');
            if (href && new RegExp('[?&]p=' + nextPage + '(?:&|$)').test(href)) {
                nextUrl = new URL(href, url).toString();
                break;
            }
        }
        return { items: items, nextUrl: nextUrl };
    }

    async onRefresh() {
        if (!this.key) return;
        try {
            let result = await this.request(this.makeURL(this.key), 2);
            this.page = 1;
            this.nextURL = result.nextUrl;
            this.setState(() => {
                this.data.list = result.items;
                this.data.loading = false;
                this.data.hasMore = !!this.nextURL;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => {
                this.data.loading = false;
            });
        }
    }

    async onLoadMore() {
        if (!this.nextURL) return;
        this.setState(() => {
            this.data.loading = true;
        });
        try {
            let nextPage = this.page + 2;
            let result = await this.request(this.nextURL, nextPage);
            this.page = nextPage - 1;
            this.nextURL = result.nextUrl;
            this.setState(() => {
                for (let item of result.items) this.data.list.push(item);
                this.data.loading = false;
                this.data.hasMore = !!this.nextURL;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => {
                this.data.loading = false;
            });
        }
    }
}

module.exports = SearchController;
