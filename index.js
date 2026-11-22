const site = require('./site');

function buildTabs(base) {
    let url = path => `${base.slice(0, -1)}${path}`;
    return [
        {
            title: "更新",
            id: "latest",
            url: url('/albums.html'),
            pageUrl: url('/albums-index-page-{0}.html')
        },
        {
            title: "同人誌",
            id: "doujin",
            url: url('/albums-index-cate-5.html'),
            pageUrl: url('/albums-index-page-{0}-cate-5.html')
        },
        {
            title: "單行本",
            id: "book",
            url: url('/albums-index-cate-6.html'),
            pageUrl: url('/albums-index-page-{0}-cate-6.html')
        },
        {
            title: "排名",
            id: "ranking",
            url: url('/albums-favorite_ranking.html'),
            pageUrl: url('/albums-favorite_ranking-page-{0}-type-week.html')
        }
    ];
}

class IndexController extends Controller {
    load() {
        this.data = {
            tabs: buildTabs(site.getCachedBase() || 'https://www.wnacg.buzz/')
        };
        this.refreshTabs();
    }

    async refreshTabs() {
        try {
            let base = await site.getBase();
            if (new URL(this.data.tabs[0].url).origin !== new URL(base).origin) {
                this.setState(() => {
                    this.data.tabs = buildTabs(base);
                });
            }
        } catch (e) {
            showToast(`Could not resolve the current WNACG address: ${e}`);
        }
    }
}

module.exports = IndexController;
