const { readFileSync } = require('fs');
const { readFile } = require('fs').promises;
const express = require('express');
const { request } = require('http');

const app = express();

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const appServer = app.listen(PORT, () => console.log(`App available at http://localhost:${PORT}`));

app.get('/', async (request, response) => {
    response.send( await readFile('./home.html', 'utf8') );
});

const io = require('socket.io')(appServer, {
    cors : { origin : '*' }
});

io.on('connection', (socket) => {
    console.log('a user connected');
});