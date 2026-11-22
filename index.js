class IndexController extends Controller {
    load() {
        this.data = {
            tabs: [
                {
                    title: "更新",
                    id: "latest",
                    url: "https://www.wnacg.com/albums.html",
                    pageUrl: "https://www.wnacg.com/albums-index-page-{0}.html"
                },
                {
                    title: "同人誌",
                    id: "doujin",
                    url: "https://www.wnacg.com/albums-index-cate-5.html",
                    pageUrl: "https://www.wnacg.com/albums-index-page-{0}-cate-5.html"
                },
                {
                    title: "單行本",
                    id: "book",
                    url: "https://www.wnacg.com/albums-index-cate-6.html",
                    pageUrl: "https://www.wnacg.com/albums-index-page-{0}-cate-6.html"
                },
                {
                    title: "排名",
                    id: "ranking",
                    url: "https://www.wnacg.com/albums-favorite_ranking.html",
                    pageUrl: "https://www.wnacg.com/albums-favorite_ranking-page-{0}-type-week.html"
                }
            ]
        };
    }
}

module.exports = IndexController;
