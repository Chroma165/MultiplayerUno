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

app.get('/lobby', async (request, response) => {
    if (activeRoomCodes.has(request.query.room)) {
        response.send( await readFile('./lobby.html', 'utf8') );
    }
    else {
        response.send( await readFile('./error.html', 'utf8') );
    }
});

app.get('/game', async (request, response) => {
    if (activeRoomCodes.has(request.query.room)) {
        response.send( await readFile('./game.html', 'utf8') );
    }
    else {
        response.send( await readFile('./error.html', 'utf8') );
    }
});

const io = require('socket.io')(appServer, {
    cors : { origin : '*' }
});

const standartDeck = [
    'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'rs', 'rr', 'r+2', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'rs', 'rr', 'r+2',
    'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'bs', 'br', 'b+2', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'bs', 'br', 'b+2',
    'g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'gs', 'gr', 'g+2', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'gs', 'gr', 'g+2',
    'y0', 'y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8', 'y9', 'ys', 'yr', 'y+2', 'y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8', 'y9', 'ys', 'yr', 'y+2',
    'swild', 'swild', 'swild', 'swild', 's+4', 's+4', 's+4', 's+4'
];

//const users = [];
const rooms = [];
const activeRoomCodes = new Set();
const roomCodeLength = 6;
const roomCodeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

io.on('connection', (socket) => {
    console.log('a user connected');


    socket.on('createRoom', (user) => {
        console.log('creating Room');
        const room = generateRoom(user, roomCodeLength);
        //users.push(user);
        rooms.push(room);
        socket.emit('moveToRoom', { code: room.code });
    });

    socket.on('joinRoom', (user, roomCode) => {
        const room = rooms.find(r => r.code === roomCode);
        if (!room) {
            socket.emit('roomNotFound');
        } else if (room.players.length >= room.maxPlayers) {
            socket.emit('roomFull');
        } else if (room.players.some(p => p.name && user.name && p.name === user.name)) {
            socket.emit('usernameTaken');
        } else {
            user.type = 'player';
            room.players.push(user);
            //users.push(user);
            socket.emit('moveToRoom', { code: room.code });
            io.to(room.code).emit('newPlayer');
        }
    });

    socket.on('joinSocketRoom', (user) => {
        socket.user = user;
        socket.join(user.roomCode);
    });

    socket.on('getRoomInfo', (callback) => {
        const user = socket.user;
        const room = rooms.find(r => r.code === user.roomCode);
        callback(room);
    });

    socket.on('updateRules', (newRules) => {
        const user = socket.user;
        const room = rooms.find(r => r.code === user.roomCode);
        if (room && socket.user.type === 'host') {
            room.rules = { ...room.rules, ...newRules };
            io.to(user.roomCode).emit('rulesUpdated', room.rules);
        }
    });

    socket.on('startGame', (roomCode) => {
        const room = rooms.find(r => r.code === roomCode);
        if (socket.user.type === 'host') {
            room.isIngame = true;
            shuffleArray(room.deck);
            io.to(roomCode).emit('gameStarted');
        }
    });

    socket.on('gameConnected', () => {
        const user = socket.user;
        const room = rooms.find(r => r.code === user.roomCode);
        room.connectedPlayers++;
        if (room.connectedPlayers == room.players.length) {
            shuffleArray(room.deck);
            io.to(user.roomCode).emit('roomReady');
            for(let i=0; i<room.players.length; i++) {
                room.players[i].hand = room.deck.splice(0, 7);
            }
        }
    });

    socket.on('getHand', (callback) => {
        const user = socket.user;
        const room = rooms.find(r => r.code === user.roomCode);
        const userHand = room.players.find(p => p.name === user.name).hand;
        callback(userHand);
    });

    socket.on('disconnect', () => {
        if (socket.user){
            console.log(`User ${socket.user.name} disconnected`);

        } else {
            console.log('A user disconnected');
        }
    });
    
});

function generateRoom(host, codeLength) {
    const roomCode = generateRoomCode(codeLength);;
    const room = {
        deck : standartDeck,
        players : [host],
        maxPlayers : 8,
        code : roomCode,
        isIngame : false,
        connectedPlayers : 0,
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

const shuffleArray = array => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
