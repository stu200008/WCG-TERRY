const MAX_CONCURRENT_REQUESTS = 2;
const MIN_REQUEST_INTERVAL = 150;
const MAX_RETRIES = 5;

let activeRequests = 0;
let waitingRequests = [];
let nextRequestAt = 0;

function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function acquire() {
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
        activeRequests++;
        return Promise.resolve();
    }
    return new Promise(resolve => waitingRequests.push(resolve));
}

function release() {
    let next = waitingRequests.shift();
    if (next) next();
    else activeRequests--;
}

function retryDelay(response, attempt) {
    let value = null;
    if (response.headers && response.headers.get) {
        value = response.headers.get('Retry-After');
    } else if (typeof response.headers === 'string') {
        let match = response.headers.match(/(?:^|\r?\n)retry-after:\s*([^\r\n]+)/i);
        if (match) value = match[1].trim();
    }

    if (value) {
        let seconds = Number(value);
        if (!isNaN(seconds)) return Math.max(1000, seconds * 1000);

        let date = Date.parse(value);
        if (!isNaN(date)) return Math.max(1000, date - Date.now());
    }

    return Math.min(30000, 1000 * Math.pow(2, attempt));
}

async function waitForRequestSlot() {
    while (true) {
        let delay = nextRequestAt - Date.now();
        if (delay > 0) {
            await wait(delay);
            continue;
        }
        nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL;
        return;
    }
}

module.exports = async function(url, options) {
    await acquire();

    try {
        for (let attempt = 0; attempt < MAX_RETRIES; ++attempt) {
            await waitForRequestSlot();

            let response = await fetch(url, options);
            if (response.status !== 429) return await response.text();
            if (attempt === MAX_RETRIES - 1) {
                await response.text();
                throw new Error(`WNACG returned HTTP 429 after ${MAX_RETRIES} attempts: ${url}`);
            }
            let delay = retryDelay(response, attempt);
            await response.text();
            nextRequestAt = Math.max(nextRequestAt, Date.now() + delay);
            await wait(delay);
        }
    } finally {
        release();
    }
};
