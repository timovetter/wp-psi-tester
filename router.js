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
                return {
                    url: test_url,
                    metrics: audits.metrics.details.items,
                    total_blocking_time: audits['total-blocking-time'],
                    largest_contentful_paint: audits['largest-contentful-paint'],
                    cumulative_layout_shift: audits['cumulative-layout-shift'],
                    total_byte_weight: audits['total-byte-weight'],
                    categories: json.lighthouseResult.categories,
                }
            }));
    }

    const d = await Promise.all(promises).then(data => data)
    const r = await createIssue("Test Metrics | " + body.name, JSON.stringify(d)).then(res => res.json());
    for (const index in d) {
        db.createRawEntry(body.name, body.urls[index], JSON.stringify(d[index]));
    }
    res.json(d);
});

module.exports = router;
