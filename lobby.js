const socket = io();

const user = JSON.parse(sessionStorage.getItem('user'));
const roomCode = user.roomCode;
const rulesContainer = document.querySelector('#rulesContainer');
const isHost = user && user.type === 'host';

let room;

socket.emit('getRoomInfo', roomCode, (r) => {
    if (!r) {
        window.location.href = 'error.html';
        return;
    }
    renderPlayerList(r.players);
    room = r;
    document.querySelector('#lobbyCode').innerHTML = room.code;
    const copyBtn = document.getElementById('copyLobbyCode');
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(room.code);
        copyBtn.textContent = '✅';
        setTimeout(() => { copyBtn.textContent = '📋'; }, 1200);
    };

    // Only host can edit
    const isHost = user && user.type === 'host';
    renderRules(r.rules, isHost);
    const startButton = document.createElement('button');
    const playerListContainer = document.querySelector('#playerListContainer');
    
    startButton.innerHTML = isHost ? 'Start Game' : room.isIngame ? 'Wait for game to end' : 'Waiting for host';
    startButton.disabled = !isHost;
    playerListContainer.appendChild(startButton);
    if (isHost) {
    startButton.onclick = () => {
        socket.emit('startGame', room.code);
    };
}
});

socket.emit('joinSocketRoom', roomCode, user);





function renderPlayerList(players) {
    const playerList = document.querySelector('#playerList');
    playerList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = (player.name || player) + ` (${player.type})`;
        playerList.appendChild(li);
    });
}

function renderRules(rules, editable) {
    rulesContainer.innerHTML = '';
    const form = document.createElement('form');
    form.id = 'rulesForm';

    Object.entries(rules).forEach(([key, value]) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'rule-row';

        const label = document.createElement('label');
        label.className = 'switch';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = value;
        checkbox.disabled = !editable;
        checkbox.dataset.rule = key;

        const slider = document.createElement('span');
        slider.className = 'slider';

        label.appendChild(checkbox);
        label.appendChild(slider);

        const desc = document.createElement('span');
        desc.className = 'rule-desc';
        desc.textContent = ruleDescriptions[key] || key;

        wrapper.appendChild(desc);
        wrapper.appendChild(label);
        form.appendChild(wrapper);
    });

    if (editable) {
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = 'Save Rules';
        saveBtn.className = 'save-rules-btn';
        saveBtn.onclick = () => {
            // Gather new rules
            const newRules = {};
            form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                newRules[cb.dataset.rule] = cb.checked;
            });
            socket.emit('updateRules', room.code, newRules);
        };
        form.appendChild(saveBtn);
    }

    rulesContainer.appendChild(form);
}

// Add human-readable descriptions for each rule
const ruleDescriptions = {
    blackOnBlack: 'Allow black on black',
    d2ond2: 'Allow +2 on +2',
    d4ond4: 'Allow +4 on +4',
    d2ond4: 'Allow +2 on +4',
    d4ond2: 'Allow +4 on +2',
    throwInBetween: 'Allow throw in-between',
    playDouble: 'Allow playing doubles',
    countDouble: 'Count both cards when playing doubles',
    playAfterDraw: 'Allow playing after drawing',
};

socket.on('rulesUpdated', (rules) => {
    if (room) room.rules = rules;
    // Only host can edit
    const isHost = user && user.type === 'host';
    renderRules(rules, isHost);
    if (isHost) {
        const saveBtn = document.querySelector('.save-rules-btn');
        saveBtn.textContent = 'Rules saved!'
        setTimeout(() => { saveBtn.textContent = 'Save Rules'; }, 1200);
    }
    
});

socket.on('newPlayer', (user) => {
    room.players.push(user);
    renderPlayerList(room.players);
});

socket.on('gameStarted', () => {
    sessionStorage.setItem('rules', JSON.stringify(room.rules));
    window.location.href = `game?room=${room.code}`;
});