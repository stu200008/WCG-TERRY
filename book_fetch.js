const SITE_URL = 'https://www.wnacg.com/';

async function fetchText(url) {
    let res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Referer': SITE_URL
        }
    });
    return await res.text();
}

function parsePages(doc, url) {
    let cards = doc.querySelectorAll('.gallary_wrap .gallary_item');
    let pages = [];

    for (let card of cards) {
        let linkNode = card.querySelector('.pic_box a');
        let img = card.querySelector('.pic_box img');
        if (!linkNode || !img) continue;

        let link = linkNode.getAttribute('href');
        let picture = img.getAttribute('src') || img.getAttribute('data-src');
        if (!link || link.indexOf('/photos-view-id-') < 0) continue;
        if (!picture) continue;

        let title = img.getAttribute('alt') || `Page ${pages.length + 1}`;
        pages.push({
            title: title,
            link: new URL(link, url).toString(),
            picture: new URL(picture, url).toString(),
            pictureHeaders: { Referer: SITE_URL }
        });
    }
    return pages;
}

function getAlbumPageCount(doc) {
    let pageCount = 1;
    for (let anchor of doc.querySelectorAll('a')) {
        let href = anchor.getAttribute('href');
        let match = href && href.match(/\/photos-index-page-(\d+)-aid-\d+\.html/);
        if (match) pageCount = Math.max(pageCount, parseInt(match[1], 10));
    }
    return pageCount;
}

function makeAlbumPageUrl(url, page) {
    return url.replace(
        /\/photos-index-aid-(\d+)\.html$/,
        `/photos-index-page-${page}-aid-$1.html`
    );
}

async function fetchDownloadUrl(url, albumDoc) {
    let downloadPage;
    let anchors = albumDoc.querySelectorAll('a');
    for (let anchor of anchors) {
        let href = anchor.getAttribute('href');
        if (href && href.indexOf('/download-index-aid-') >= 0) {
            downloadPage = new URL(href, url).toString();
            break;
        }
    }
    if (!downloadPage) return null;

    let doc = HTMLParser.parse(await fetchText(downloadPage));
    for (let anchor of doc.querySelectorAll('a')) {
        let href = anchor.getAttribute('href');
        if (href && /\.zip(?:[?#]|$)/i.test(href)) {
            return new URL(href, downloadPage).toString();
        }
    }
    return null;
}

module.exports = async function(url, includeDownload, includeAllPages) {
    let doc = HTMLParser.parse(await fetchText(url));
    let pages = parsePages(doc, url);
    if (pages.length === 0) {
        throw new Error('No image pages found on the WNACG album');
    }

    if (includeAllPages !== false) {
        let pageCount = getAlbumPageCount(doc);
        for (let start = 2; start <= pageCount; start += 4) {
            let pageNumbers = [];
            for (let page = start; page < start + 4 && page <= pageCount; ++page) {
                pageNumbers.push(page);
            }
            let batches = await Promise.all(pageNumbers.map(async function(page) {
                let pageUrl = makeAlbumPageUrl(url, page);
                let pageDoc = HTMLParser.parse(await fetchText(pageUrl));
                return parsePages(pageDoc, pageUrl);
            }));
            for (let batch of batches) {
                for (let item of batch) pages.push(item);
            }
        }
    }

    let result = {
        summary: `${pages.length} pages`,
        list: pages.reverse(),
        downloadUrl: null,
        downloadError: null
    };

    if (includeDownload) {
        try {
            result.downloadUrl = await fetchDownloadUrl(url, doc);
        } catch (e) {
            result.downloadError = e.toString();
        }
    }
    return result;
};
