const {Client} = require('pg')
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    port: 5432,
})
client.connect();

client.query('CREATE TABLE IF NOT EXISTS raw(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, timestamp timestamp default current_timestamp, commit text, URL text, result json)', null, (err, res) => {
    if (err) {
        console.log(err.stack)
    } else {
        console.log(res)
    }
})

client.query('CREATE TABLE IF NOT EXISTS calculated(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, timestamp timestamp default current_timestamp, rawIds text[], summary json)', null, (err, res) => {
    if (err) {
        console.log(err.stack)
    } else {
        console.log(res)
    }
})

const getRawData = (id) => {
    return new Promise((resolve, reject) => {
        client.query('SELECT * FROM raw where id=$1', [id], (err, res) => {
            if (err) {
                reject(err);
            } else if (res.rows.length) {
                resolve(res.rows[0]);
            }
        });
    });
}

const getCalculatedData = (id) => {
    return new Promise((resolve, reject) => {
        client.query('SELECT * FROM calculated where id=$1', [id], (err, res) => {
            if (err) {
                reject(err);
            } else if (res.rows.length) {
                resolve(res.rows[0]);
            }
        });
    });
}

const insertRawData = (commitId, url, result) => {
    return new Promise((resolve, reject) => {
        client.query('INSERT INTO raw(commit, url, result) VALUES($1, $2, $3) RETURNING *', [commitId, url, result], (err, res) => {
            if (err) {
                reject(err);
            } else if(res.rows.length) {
                resolve(res.rows[0].id);
            } else {
                reject('no error and no entry');
            }
        });
    });
}

const insertCalculatedData = (rawIds, summary) => {
    return new Promise((resolve, reject) => {
        client.query('INSERT INTO calculated(rawIds, summary) VALUES($1, $2)', [rawIds, summary], (err, res) => {
            if (err) {
                reject(err);
            } else {
                console.log(res);
            }
        });
    });
}

module.exports = insertRawData;
module.exports = insertCalculatedData;
module.exports = getRawData;

// async function test() {
//     const id = await insertRawData('test', 'test', '{}');
//     console.log(id);
//     const data = await getRawData(id);
//     console.log(data);
// }
// test();


