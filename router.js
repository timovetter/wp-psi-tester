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

    //const calculatedInsertRes = await db.createCalculatedData(body.name, JSON.stringify(d));
    // for (const index in d) {
    //     db.createRawEntry(calculatedInsertRes, body.urls[index], JSON.stringify(d[index]));
    // }
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
        for (const dElement of Object.keys(data[url][0].audits)) {
            if (data[url][0].audits[dElement].score !== null ){
                post = post.concat('\n', `**${dElement}:** ${data[url][0].audits[dElement].score}`);
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
