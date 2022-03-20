const {Client} = require('pg')
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    port: 5432,
})
client.connect();

client.query('CREATE TABLE IF NOT EXISTS raw(id serial primary key, timestamp timestamp default current_timestamp, commit text, URL text, result json)', null, (err, res) => {
    if (err) {
        console.log(err.stack)
    } else {
        console.log(res)
    }
})

client.query('CREATE TABLE IF NOT EXISTS calculated(id serial primary key, timestamp timestamp default current_timestamp, rawIds text[], summary json)', null, (err, res) => {
    if (err) {
        console.log(err.stack)
    } else {
        console.log(res)
    }
})

module.exports = function getRawData(id) {
    console.log(id);
}

const insertRawData = (commitId, url, result) => {
    client.query('INSERT INTO raw(commit, url, result) VALUES($1, $2, $3)', [commitId, url, result], (res, err) => {
        if (err) {
            console.log(err.stack);
        } else {
            console.log(res);
        }
    });
}

const insertCalculatedData = (rawIds, summary) => {
    client.query('INSERT INTO calculated(rawIds, summary) VALUES($1, $2)', [rawIds, summary], (res, err) => {
        if (err) {
            console.log(err.stack);
        } else {
            console.log(res);
        }
    });
}

module.exports = insertRawData;
module.exports = insertCalculatedData;

