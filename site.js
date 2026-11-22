const RELEASE_URL = 'https://wnlink.ru/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const CACHE_DURATION = 5 * 60 * 1000;
const rateLimitedFetch = require('./network');

let cachedBase = null;
let cachedAt = 0;
let resolving = null;

function isWnacgHost(host) {
    return /^(?:www\.)?wnacg\.(?:[a-z0-9-]+\.)*[a-z0-9-]+$/i.test(host);
}

function getOrigin(url) {
    let text = new URL(url).toString();
    let match = text.match(/^(https?:\/\/[^/]+)/i);
    if (!match) throw new Error(`Could not determine the domain for ${url}`);
    return match[1];
}

function getHost(url) {
    return getOrigin(url).replace(/^https?:\/\//i, '').toLowerCase();
}

async function resolveBase() {
    let text = await rateLimitedFetch(RELEASE_URL, {
        headers: { 'User-Agent': USER_AGENT }
    });
    let doc = HTMLParser.parse(text);
    let candidates = [];

    for (let anchor of doc.querySelectorAll('a')) {
        let href = anchor.getAttribute('href');
        if (!href) continue;

        let candidate;
        try {
            candidate = new URL(href, RELEASE_URL).toString().replace(/^http:/i, 'https:');
        } catch (e) {
            continue;
        }
        if (!isWnacgHost(getHost(candidate))) continue;

        let base = `${getOrigin(candidate)}/`;
        if (candidates.indexOf(base) < 0) candidates.push(base);
    }

    if (candidates.length === 0) {
        throw new Error(`No WNACG domains found on ${RELEASE_URL}`);
    }

    let failures = [];
    for (let base of candidates) {
        try {
            let html = await rateLimitedFetch(new URL('/albums.html', base).toString(), {
                headers: { 'User-Agent': USER_AGENT }
            });
            let page = HTMLParser.parse(html);
            if (page.querySelectorAll('.gallary_wrap .gallary_item').length > 0) {
                return base;
            }
            failures.push(`${base}: no album list found`);
        } catch (e) {
            failures.push(`${base}: ${e}`);
        }
    }

    throw new Error(`No published WNACG domain is available: ${failures.join('; ')}`);
}

async function getBase(force) {
    if (!force && cachedBase && Date.now() - cachedAt < CACHE_DURATION) {
        return cachedBase;
    }
    if (resolving) return resolving;

    let operation = resolveBase().then(base => {
        cachedBase = base;
        cachedAt = Date.now();
        localStorage['wnacg:base'] = base;
        return base;
    }).catch(error => {
        let saved = localStorage['wnacg:base'];
        if (saved) {
            if (isWnacgHost(getHost(saved))) {
                cachedBase = `${getOrigin(saved)}/`;
                cachedAt = Date.now();
                showToast(`Could not refresh the WNACG address; using the last known domain. ${error}`);
                return cachedBase;
            }
        }
        throw error;
    });

    resolving = operation.then(base => {
        resolving = null;
        return base;
    }, error => {
        resolving = null;
        throw error;
    });
    return resolving;
}

function getCachedBase() {
    if (cachedBase) return cachedBase;

    let saved = localStorage['wnacg:base'];
    if (!saved) return null;

    try {
        if (isWnacgHost(getHost(saved))) return `${getOrigin(saved)}/`;
    } catch (e) {
    }
    return null;
}

function normalizeWithBase(url, base) {
    let target = new URL(url, base).toString();
    let targetOrigin = getOrigin(target);
    if (!isWnacgHost(getHost(target))) return target;
    return `${getOrigin(base)}${target.slice(targetOrigin.length)}`;
}

function normalizeCachedUrl(url) {
    let base = getCachedBase();
    return base ? normalizeWithBase(url, base) : url;
}

async function normalizeUrl(url) {
    return normalizeWithBase(url, await getBase());
}

module.exports = {
    getBase: getBase,
    getCachedBase: getCachedBase,
    getOrigin: getOrigin,
    normalizeUrl: normalizeUrl,
    normalizeCachedUrl: normalizeCachedUrl
};
