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

app.get('/lobby/', async (request, response) => {
    if (activeRoomCodes.has(request.query.room)) {
        response.send( await readFile('./lobby.html', 'utf8') );
    }
    else {
        response.send( await readFile('./error.html', 'utf8') );
    }
});

const io = require('socket.io')(appServer, {
    cors : { origin : '*' }
});

const users = [];
const rooms = [];
const activeRoomCodes = new Set();
const roomCodeLength = 6;
const roomCodeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

io.on('connection', (socket) => {
    console.log('a user connected');


    socket.on('createRoom', (user) => {
        console.log('creating Room');
        const room = generateRoom(user, roomCodeLength);
        users.push(user);
        rooms.push(room);
        socket.join(room.code);
        socket.emit('moveToRoom', { code: room.code });
    });

    socket.on('joinRoom', (user, roomCode) => {
        const room = rooms.find(r => r.code === roomCode);
        if (!room) {
            socket.emit('roomNotFound');
        } else if (room.players.length >= room.maxPlayers) {
            socket.emit('roomFull');
        } else {
            room.players.push(user);
            users.push(user);
            socket.emit('moveToRoom', { code: room.code });
            io.to(room.code).emit('newPlayer', user);
        }
    });

    socket.on('joinSocketRoom', (roomCode) => {
        socket.join(roomCode);
    });

    socket.on('getRoomInfo', (roomCode, callback) => {
        const room = rooms.find(r => r.code === roomCode);
        callback(room);
    });

    socket.on('updateRules', (roomCode, newRules) => {
        const room = rooms.find(r => r.code === roomCode);
        if (room) {
            room.rules = { ...room.rules, ...newRules };
            // Optionally, broadcast updated rules to all clients in the room
            io.to(roomCode).emit('rulesUpdated', room.rules);
        }
    });
    
});

function generateRoom(host, codeLength) {
    const roomCode = generateRoomCode(codeLength);;
    const room = {
        players : [host],
        maxPlayers : 8,
        code : roomCode,
        rules : {
            blackOnBlack : true, // Darf man Schwarz auf Scharz legen?
            d2ond2 : true, // Darf man eine +2 auf eine +2 legen?
            d4ond4 : true, // Darf man eine +4 auf eine +4 legen?
            d2ond4 : false, // Darf man eine +2 auf eine +4 legen?
            d4ond2 : false, // Darf man eine +4 auf eine +2 legen?
            throwInBetween : true, // Darf man eine identische Karte dazwischen Werfen?
            playDouble : true, // Darf man zwei identische Karten gleichzeitig legen?
            countDouble : true, // Zählen beide karten wenn man doppelt legt?
            playAfterDraw : true, // Darf man legen nachdem man gezogen hat?
        }
    };
    return room;
}

function generateRoomCode(length) {
    let code;
    let tries = 0;
    do {
        tries++;
        if (tries > 500) length++;

        code = '';
        for (let i=0; i<length; i++) {
            const index = Math.floor(Math.random() * roomCodeChars.length);
            code += roomCodeChars[index];
        }
    } while (activeRoomCodes.has(code));
    activeRoomCodes.add(code);
    console.log(code);
    return code;
}
