const site = require('./site');

class IndexController extends Controller {
    async load() {
        let base = await site.getBase();
        let url = path => `${base.slice(0, -1)}${path}`;
        this.data = {
            tabs: [
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
            ]
        };
    }
}

module.exports = IndexController;
