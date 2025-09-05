const socket = io();

const createRoom = document.querySelector('#createRoom');
const joinRoom = document.querySelector('#joinRoom');
const roomCodeInput = document.querySelector('#roomCodeInput');
const userNameInput = document.querySelector('#userNameInput');

let user;

createRoom.addEventListener('click', () => {
    if (userNameInput.value.charAt(0) == ' ') {
        alert("Username can't start with a space");
    }
    else if (userNameInput.value) {
        user = {
            userName : userNameInput.value,
            type : 'host',
            room : null,
        }
        socket.emit('createRoom', user);
    }
    else {
        alert("Enter Username");
    }
});

socket.on('joinRoom', (room) => {
    user.room = room;
    window.location.href = `lobby?room=${room.code}`;
    console.log(room);
});