const pshConfig = require('platformsh-config').config();
const router = require('./router');
const express = require('express')
const cors = require('cors');
const app = express()
let port = 3000;

if (pshConfig.inRuntime()) {
    port = pshConfig.port;
}

require('./database'); //for testing the db connection

app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.use(router);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
