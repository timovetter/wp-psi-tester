import fetch from 'node-fetch';

let base64 = require('base-64');

const config = {
    username: "",
    token: "",
    repo: "",
}

const createIssue = async (title, body) => {
    const postBody = {
        title,
        body
    }
    return await fetch('https://api.github.com/repos/' + config.repo + '/issues', {
        method: 'post',
        body: JSON.stringify(postBody),
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'Basic ' + base64.encode(config.username + ":" + config.token)
        }
    })
}

module.exports = createIssue;
