const site = require('./site');

function buildTabs(base) {
    let url = path => `${base.slice(0, -1)}${path}`;
    let categoryTabs = function(title, items) {
        return {
            title: title,
            subtabs: items.map(function(item) {
                return {
                    title: item.title,
                    id: item.id,
                    url: url(`/albums-index-cate-${item.category}.html`),
                    pageUrl: url(`/albums-index-page-{0}-cate-${item.category}.html`)
                };
            })
        };
    };
    let rankingTabs = ['day', 'week', 'month', 'year'].map(function(type, index) {
        let titles = ['今日', '本週', '本月', '今年'];
        return {
            title: titles[index],
            id: `ranking-${type}`,
            url: url(`/albums-favorite_ranking-type-${type}-cate.html`),
            pageUrl: url(`/albums-favorite_ranking-page-{0}-type-${type}.html`)
        };
    });

    return [
        {
            title: "更新",
            id: "latest",
            url: url('/albums.html'),
            pageUrl: url('/albums-index-page-{0}.html')
        },
        categoryTabs("同人誌", [
            { title: "漢化", id: "doujin-translated", category: 1 },
            { title: "日語", id: "doujin-japanese", category: 12 },
            { title: "English", id: "doujin-english", category: 16 },
            { title: "CG畫集", id: "doujin-cg", category: 2 },
            { title: "AI圖集", id: "doujin-ai", category: 37 },
            { title: "3D漫畫", id: "doujin-3d", category: 22 },
            { title: "Cosplay", id: "doujin-cosplay", category: 3 }
        ]),
        categoryTabs("單行本", [
            { title: "漢化", id: "book-translated", category: 9 },
            { title: "日語", id: "book-japanese", category: 13 },
            { title: "English", id: "book-english", category: 17 }
        ]),
        categoryTabs("雜誌&短篇", [
            { title: "漢化", id: "magazine-translated", category: 10 },
            { title: "日語", id: "magazine-japanese", category: 14 },
            { title: "English", id: "magazine-english", category: 18 }
        ]),
        {
            title: "排名",
            subtabs: rankingTabs
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
            if (site.getOrigin(this.data.tabs[0].url) !== site.getOrigin(base)) {
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
