const express =  require('express');
const fetch = require('node-fetch');
const createIssue = require('./github')

const router = require('express').Router();

router.use(express.json());    // parse request body as JSON

const psi_url = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

router.post('/tests', async function (req, res) {
    const body = req.body;
    if (body.urls === undefined) {
        res.sendStatus(400);
        return;
    }

    const promises = [];
    for (const test_url of body.urls) {
        const url = new URL(psi_url);
        url.searchParams.append('url', test_url);
        url.searchParams.append('key', process.env.PSI_KEY);
        promises.push(fetch(url.href).then(res => res.json())
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
    const r = await createIssue("Test Metrics", JSON.stringify(d)).then(res => res.json());
    console.log(r);
    res.json(d);
});

module.exports = router;
