const express = require('express');
const fetch = require('node-fetch');
const createIssue = require('./github');
const pshConfig = require('platformsh-config').config();
const db = require('./database');

const router = require('express').Router();

router.use(express.json());    // parse request body as JSON

const psi_url = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

router.post('/tests', async function (req, res) {
    const body = req.body;
    if (body.urls === undefined || body.name === undefined) {
        res.sendStatus(400);
        return;
    }

    const promises = [];
    for (const test_url of body.urls) {
        const url = new URL(psi_url);
        url.searchParams.append('url', test_url);
        url.searchParams.append('key', pshConfig.variable("PSI_KEY", process.env.PSI_KEY));
        for (let i = 0; i < 3; i++) {
            promises.push(fetch(url.href)
                .then(res => {
                    if (res.status === 200) return res.json()
                    res.text()
                        .then(t => console.log(res.status, t))
                    return {}
                })
                .then(json => {
                    const audits = json.lighthouseResult.audits;
                    for (const a in audits) {
                        delete audits[a].details;
                    }
                    delete json.lighthouseResult.categories.performance.auditRefs;
                    return {
                        url: test_url,
                        audits: audits,
                        categories: json.lighthouseResult.categories,
                    }
                }));
        }
    }
    let d = await Promise.all(promises).then(data => data)
    d = groupData(d);
    let post = createPost(d);
    const r = await createIssue("Test Metrics | " + body.name, post).then(res => res.json());


    for (const url of Object.keys(d)) {
        const m = median(url, d[url]);
        const id = await db.createCalculatedData(body.name, m);
        for (const rawValue of d[url]) {
            await db.createRawEntry(id, url, rawValue);
        }
    }

    res.json(d);
});


function groupData(data) {
    const o = {};
    for (const d of data) {
        if (Object.keys(o).includes(d.url)) {
            o[d.url].push(d);
        } else {
            o[d.url] = [];
            o[d.url].push(d);
        }
    }
    return o;
}

function median(url, raw) {
    const m = {url};

    for (const key of Object.keys(raw[0].audits)) {
        if (raw[0].audits[key].score === null ) {
            continue;
        }
        const values = []
        for (let i = 0; i < raw.length; i++) {
            values.push(raw[i].audits[key].score);
        }

        m[key] = medianValue(values);
    }
    return m
}

function medianValue(values) {
    if(values.length ===0) throw new Error("No inputs");

    values.sort(function(a,b){
        return a-b;
    });

    const half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;
}

/*
## https://trunk-hy2b2li-rk425yy73kk4w.us-4.platformsh.site

Scores:

**total-blocking-time:** 1
**largest-contentful-paint:** 0.95
**cumulative-layout-shift:** 0.93
**total-byte-weight:** 0.99
....
### RAW JSON START
....
### RAW JSON END
 */
function createPost(data) {
    let post = "";
    for (const url of Object.keys(data)) {
        post = post.concat(`## Test on:`, url, '\n');
        post = post.concat('\n');
        post = post.concat('Scores: ', '\n');
        if (data[url].length === 0) {
            continue;
        }
        const m = median(url, data[url]);

        for (const dElement of Object.keys(data[url][0].audits)) {
            if (data[url][0].audits[dElement].score !== null ){
                post = post.concat('\n', `**${dElement}:** ${m[dElement]}`);
            }
        }
        let i = 1;
        for (const rawData of data[url]) {
            post = post.concat(`\n\n#### RAW JSON START: RUN ${i}\n`, )
            post = post.concat('```JSON\n', JSON.stringify(rawData), '\n```');
            post = post.concat(`\n#### RAW JSON END: RUN ${i}\n`)
            i++;
        }
    }

    return post;
}

module.exports = router;
