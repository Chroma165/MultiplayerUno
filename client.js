const socket = io();

const createRoom = document.querySelector('#createRoom');
const joinRoom = document.querySelector('#joinRoom');
const roomCodeInput = document.querySelector('#roomCodeInput');
const userNameInput = document.querySelector('#userNameInput');

if (JSON.parse(sessionStorage.getItem('user'))){
    userNameInput.value = JSON.parse(sessionStorage.getItem('user')).name;
}

let user;

createRoom.addEventListener('click', () => {
    if (userNameInput.value.charAt(0) == ' ') {
        alert("Username can't start with a space");
    }
    else if (userNameInput.value) {
        user = {
            name : userNameInput.value,
            type : 'host',
        }
        sessionStorage.setItem('user', JSON.stringify(user));
        socket.emit('createRoom', user);
    }
    else {
        alert("Enter Username");
    }
});

joinRoom.addEventListener('click', () => {
    if (userNameInput.value.charAt(0) == ' ') {
        alert("Username can't start with a space");
    }
    else if (!userNameInput.value) {
        alert("Enter username");
    }
    else if (!roomCodeInput.value) {
        alert("Enter roomcode");
    }
    else {
        user = {
            name : userNameInput.value,
            type : 'player',
        }
        sessionStorage.setItem('user', JSON.stringify(user));
        socket.emit('joinRoom', user, roomCodeInput.value.toUpperCase());
    }
});

socket.on('moveToRoom', (room) => {
    user.roomCode = room.code;
    sessionStorage.setItem('user', JSON.stringify(user));
    window.location.href = `lobby?room=${room.code}`;
});

socket.on('roomFull', () => {
    alert("This room is full");
});

socket.on('roomNotFound', () => {
    alert("This room doesn't exist");
});

socket.on('usernameTaken', () => {
    alert('This username is already taken');
});