const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const rateLimitedFetch = require('./network');
const site = require('./site');

async function fetchText(url) {
    let referer = `${site.getOrigin(url)}/`;
    return await rateLimitedFetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Referer': referer
        }
    });
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
            pictureHeaders: {
                Referer: `${site.getOrigin(url)}/`,
                'User-Agent': USER_AGENT
            }
        });
    }
    return pages;
}

async function fetchImageUrls(url) {
    let match = url.match(/\/photos-index-aid-(\d+)\.html(?:[?#].*)?$/);
    if (!match) throw new Error(`Invalid WNACG album URL: ${url}`);

    let imageListUrl = new URL(`/photos-item-aid-${match[1]}.html`, url).toString();
    let text = await fetchText(imageListUrl);
    let matchData = text.match(/"page_url"\s*:\s*(\[[\s\S]*?\])\s*,\s*"page_size"\s*:/);
    if (!matchData) {
        throw new Error(`Could not find the image URL list at ${imageListUrl}`);
    }

    let imageUrls;
    try {
        imageUrls = JSON.parse(matchData[1].replace(/,\s*\]/g, ']'));
    } catch (e) {
        throw new Error(`Could not parse the image URL list at ${imageListUrl}: ${e}`);
    }
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        throw new Error(`No image URLs found at ${imageListUrl}`);
    }

    return imageUrls.map(function(imageUrl, index) {
        if (typeof imageUrl !== 'string' || imageUrl.length === 0) {
            throw new Error(`Invalid image URL at index ${index + 1} in ${imageListUrl}`);
        }
        let secureUrl = imageUrl.replace(/^http:/i, 'https:');
        let parsedUrl = new URL(secureUrl, url);
        return parsedUrl.toString();
    });
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
    url = await site.normalizeUrl(url);
    let doc = HTMLParser.parse(await fetchText(url));
    let pages = parsePages(doc, url);
    if (pages.length === 0) {
        throw new Error('No image pages found on the WNACG album');
    }

    let imageUrls = await fetchImageUrls(url);
    if (includeAllPages === false) imageUrls = imageUrls.slice(0, 1);

    let chapter = {
        title: '第 1 章',
        subtitle: `${imageUrls.length} 頁`,
        link: url,
        picture: pages[0].picture,
        pictureHeaders: pages[0].pictureHeaders,
        pages: imageUrls.map(imageUrl => ({ url: imageUrl }))
    };
    let result = {
        summary: `1 章 / ${imageUrls.length} 頁`,
        list: [chapter],
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
