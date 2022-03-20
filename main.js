const pshConfig = require('platformsh-config').config();
const express = require('express')
const app = express()
const port = pshConfig.port || 3000

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
