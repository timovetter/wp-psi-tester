const fetch = require('node-fetch');
const pshConfig = require('platformsh-config').config();

let base64 = require('base-64');

const config = {
    username: pshConfig.variable("GIT_USERNAME", process.env.GIT_USERNAME),
    token: pshConfig.variable("GIT_TOKEN", process.env.GIT_TOKEN),
    repo: pshConfig.variable("GIT_REPO", process.env.GIT_REPO),
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
