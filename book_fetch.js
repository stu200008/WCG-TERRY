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

function parseChapters(doc, url) {
    let links = doc.querySelectorAll('#sr_pub a');
    let chapters = [];

    for (let linkNode of links) {
        let href = linkNode.getAttribute('href');
        if (!href || !/\/photos-(?:slide|list)-aid-\d+-sid-\d+\.html(?:[?#].*)?$/i.test(href)) {
            continue;
        }

        let title = linkNode.getAttribute('title') || linkNode.text.trim();
        chapters.push({
            title: title || `第 ${chapters.length + 1} 章`,
            link: new URL(href, url).toString()
        });
    }
    return chapters;
}

async function fetchImageUrls(url) {
    let match = url.match(/\/photos-index-aid-(\d+)\.html(?:[?#].*)?$/) ||
        url.match(/\/photos-(?:slide|list)-aid-(\d+)-sid-\d+\.html(?:[?#].*)?$/);
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

async function fetchChapters(chapters, includeAllPages) {
    let result = [];
    for (let chapter of chapters) {
        let imageUrls = await fetchImageUrls(chapter.link);
        if (includeAllPages === false) imageUrls = imageUrls.slice(0, 1);
        let headers = {
            Referer: `${site.getOrigin(chapter.link)}/`,
            'User-Agent': USER_AGENT
        };
        result.push({
            title: chapter.title,
            subtitle: `${imageUrls.length} 頁`,
            link: chapter.link,
            picture: imageUrls[0],
            pictureHeaders: headers,
            pages: imageUrls.map(imageUrl => ({ url: imageUrl }))
        });
    }
    return result;
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
    let chapterLinks = parseChapters(doc, url);
    let chapters;
    if (chapterLinks.length > 0) {
        chapters = await fetchChapters(chapterLinks, includeAllPages);
    } else {
        let pages = parsePages(doc, url);
        if (pages.length === 0) {
            throw new Error('No image pages or chapters found on the WNACG album');
        }
        let imageUrls = await fetchImageUrls(url);
        if (includeAllPages === false) imageUrls = imageUrls.slice(0, 1);
        chapters = [{
            title: '第 1 章',
            subtitle: `${imageUrls.length} 頁`,
            link: url,
            picture: pages[0].picture,
            pictureHeaders: pages[0].pictureHeaders,
            pages: imageUrls.map(imageUrl => ({ url: imageUrl }))
        }];
    }
    let totalPages = chapters.reduce((total, chapter) => total + chapter.pages.length, 0);
    let result = {
        version: 2,
        summary: `${chapters.length} 章 / ${totalPages} 頁`,
        list: chapters,
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
