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
        promises.push(fetch(url.href).then(res => {
            if (res.status === 200) return res.json()
            res.text().then(
                t => console.log(res.status, t)
            )
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
    const d = await Promise.all(promises).then(data => data)
    let post = createPost(d);

    const r = await createIssue("Test Metrics | " + body.name, post).then(res => res.json());
    for (const index in d) {
        db.createRawEntry(body.name, body.urls[index], JSON.stringify(d[index]));
    }
    res.json(d);
});


/*
## https://trunk-hy2b2li-rk425yy73kk4w.us-4.platformsh.site

Scores:

**total-blocking-time:** 1
**largest-contentful-paint:** 0.95
**cumulative-layout-shift:** 0.93
**total-byte-weight:** 0.99
 */
function createPost(data) {
    let post = "";
    for (const d of data) {
        post = post.concat('## Test on:', d.url, '\n');
        post = post.concat('\n');
        post = post.concat('Scores: ', '\n');

        for (const dElement of Object.keys(d.audits)) {
            if (d.audits[dElement].score !== null ){
                post = post.concat('\n', `**${dElement}:** ${d.audits[dElement].score}`);
            }
        }
    }

    post = post.concat('\n\n### RAW JSON START\n')
    post = post.concat('```JSON\n',JSON.stringify(data), '\n```');
    post = post.concat('\n### RAW JSON END\n')

    return post;
}

module.exports = router;
