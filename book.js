const bookFetch = require('./book_fetch');
const site = require('./site');

class BookController extends Controller {

    get bookInfo() {
        return {
            key: this.url,
            title: this.data.title,
            subtitle: this.data.subtitle,
            picture: this.data.picture,
            page: 'book',
            data: {
                link: this.url,
                title: this.data.title,
                subtitle: this.data.subtitle,
                picture: this.data.picture,
                summary: this.data.summary,
                downloadUrl: this.data.downloadUrl
            }
        };
    }

    async load(data) {
        this.url = await site.normalizeUrl(data.link);
        this.data = {
            title: data.title,
            subtitle: data.subtitle,
            summary: data.summary,
            picture: data.picture,
            pictureHeaders: {
                Referer: this.url,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            },
            downloadUrl: data.downloadUrl || null,
            loading: false,
            editing: false,
            reverse: localStorage['reverse'] != 'false',
            list: []
        };
        this.selected = [];
        this.addHistory(this.bookInfo);

        let cached = localStorage[`book:${this.url}`];
        if (cached) {
            let saved = JSON.parse(cached);
            if (saved.title) this.data.title = saved.title;
            if (saved.summary) this.data.summary = saved.summary;
            if (saved.downloadUrl) this.data.downloadUrl = saved.downloadUrl;
            let chapterPages = saved.list &&
                saved.list.length === 1 &&
                saved.list[0].pages;
            let hasChapter = Array.isArray(chapterPages) &&
                chapterPages.length > 0 &&
                chapterPages.every(page =>
                    page &&
                    typeof page.url === 'string' &&
                    page.url.length > 0
                );
            this.data.list = hasChapter ? saved.list : [];

            if (!hasChapter || new Date().getTime() - (saved.time || 0) > 30 * 60 * 1000) {
                this.reload();
            }
        } else {
            this.reload();
        }
        FavoritesManager.clearNew(this.url);
        this.data.last = this.getLast();
    }

    onRefresh() {
        this.reload();
    }

    async reload() {
        this.setState(() => {
            this.data.loading = true;
        });
        try {
            let data = await bookFetch(this.url, true);
            data.time = new Date().getTime();
            data.title = this.data.title;
            localStorage[`book:${this.url}`] = JSON.stringify(data);
            this.setState(() => {
                this.data.summary = data.summary;
                this.data.list = data.list;
                this.data.downloadUrl = data.downloadUrl;
                this.data.loading = false;
                this.data.last = this.getLast();
            });
            if (data.downloadError) {
                showToast(`Could not load the official download URI: ${data.downloadError}`);
            }
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => {
                this.data.loading = false;
            });
        }
    }

    onArchivePressed() {
        if (this.data.downloadUrl) {
            this.openBrowser(this.data.downloadUrl);
        }
    }

    onFavoritePressed() {
        this.setState(() => {
            if (this.isFavarite()) {
                FavoritesManager.remove(this.url);
            } else {
                let last;
                if (this.data.list.length > 0) {
                    let item = this.data.list[this.data.list.length - 1];
                    last = { title: item.title, key: item.link };
                }
                this.addFavorite(this.bookInfo, last);
            }
        });
    }

    onDownloadPressed() {
        this.setState(() => {
            this.data.editing = true;
        });
    }

    onClearPressed() {
        this.selected = [];
        this.setState(() => {
            this.data.editing = false;
        });
    }

    onCheckPressed() {
        let downloads = [];
        for (let idx of this.selected) {
            let item = this.data.list[idx];
            downloads.push({
                key: item.link,
                title: this.data.title,
                link: this.url,
                picture: this.data.picture,
                subtitle: this.data.subtitle,
                data: item
            });
        }
        this.addDownload(downloads);
        this.selected = [];
        this.setState(() => {
            this.data.editing = false;
        });
    }

    async onPressed(idx) {
        if (this.data.editing) {
            this.setState(() => {
                let loc = this.selected.indexOf(idx);
                if (loc >= 0) this.selected.splice(loc, 1);
                else this.selected.push(idx);
            });
            return;
        }

        await this.openBook({
            key: this.url,
            list: this.data.list,
            index: idx
        });
        this.setState(() => {
            this.data.last = this.getLast();
        });
    }

    onOrderSelected(value) {
        this.setState(() => {
            this.data.reverse = value;
            localStorage['reverse'] = value.toString();
        });
    }

    onSourcePressed() {
        this.openBrowser(this.url);
    }

    isSelected(index) {
        return this.selected.indexOf(index) >= 0;
    }

    isDownloaded(index) {
        return DownloadManager.exist(this.data.list[index].link);
    }

    isFavarite() {
        return FavoritesManager.exist(this.url);
    }

    getLast() {
        let key = this.getLastKey(this.url);
        if (key) {
            for (let item of this.data.list) {
                if (item.link === key) return item.title;
            }
        }
        return null;
    }
}

module.exports = BookController;
