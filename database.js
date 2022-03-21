const pshConfig = require('platformsh-config').config();
const {Client} = require('pg')
let client;
if (pshConfig.inRuntime()) {
    console.log("Using PSH runtime configuration")
    const credentials = pshConfig.credentials("postgresdatabase");
    client = new Client({
        host: credentials.host,
        port: credentials.port,
        user: credentials.username,
        password: credentials.password,
        database: credentials.path,
    })
} else {
    client = new Client({
        host: "localhost",
        port: 5432,
        user: 'postgres',
    })
}

client.connect();

client.query('CREATE TABLE IF NOT EXISTS raw(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,calculated uuid, timestamp timestamp default current_timestamp, URL text, result json)', null, (err, res) => {
    if (err) {
        console.log(err.stack)
    }
})

client.query('CREATE TABLE IF NOT EXISTS calculated(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, timestamp timestamp default current_timestamp,commit text, summary json)', null, (err, res) => {
    if (err) {
        console.log(err.stack)
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


const createCalculatedData = (commitId, summury) => {
    return new Promise((resolve, reject) => {
        client.query('INSERT INTO calculated(commit, summary) VALUES($1, $2) RETURNING *', [commitId, summury], (err, res) => {
            if (err) {
                reject(err);
            } else if (res.rows.length) {
                resolve(res.rows[0].id);
            } else {
                reject('no error and no entry');
            }
        });
    });
}

const createRawEntry = (calculatedId, url, result) => {
    return new Promise((resolve, reject) => {
        client.query('INSERT INTO raw(calculated, url, result) VALUES($1, $2, $3) RETURNING *', [calculatedId, url, result], (err, res) => {
            if (err) {
                reject(err);
            } else if (res.rows.length) {
                resolve(res.rows[0].id);
            } else {
                reject('no error and no entry');
            }
        });
    });
}

const updateRawEntry = (id, result) => {
    return new Promise((resolve, reject) => {
        client.query('UPDATE raw SET result = $1 where id=$2 RETURNING *', [result, id], (err, res) => {
            if (err) {
                reject(err);
            } else if (res.rows.length) {
                resolve(res.rows[0].id);
            } else {
                reject('no error and no entry');
            }
        });
    });
}

module.exports = {
    createRawEntry,
    getRawData,
    createCalculatedData
}
