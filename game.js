const socket = io();

const user = JSON.parse(sessionStorage.getItem('user'));

let room;

let hand = [];
const oppHands = [];

let imagesLoaded = false;

socket.emit('joinSocketRoom', user);

socket.emit('getRoomInfo', (r) => {
    if (!r) {
        window.location.href = 'error.html';
        return;
    }
    room = r;
    console.log(r);
    if (r.ready) {
        socket.emit('getHand', (h) => {
        if (h) {
            hand = h;
        }
        if (imagesLoaded) {
            drawFrame();
        }
    });
    }
});

socket.emit('gameConnected');

socket.on('roomReady', () => {
    socket.emit('getHand', (h) => {
        if (h) {
            hand = h;
        }
        if (imagesLoaded) {
            drawFrame();
        }
    });
});


const screen = document.querySelector('#screen');
const ctx = screen.getContext('2d');
ctx.imageSmoothingEnabled = false;
const scaleFactor = 3;

resizeCanvas();


const COLORS = ['red', 'green', 'blue', 'yellow'];
const VALUES = ['0','1','2','3','4','5','6','7','8','9','r','s','+2']; // Vanilleeis
const BLACK_VALUES = ['wild', '+4'];

function getImageManifest() {
    const manifest = [];
    for (const color of COLORS) {
        for (const value of VALUES) {
            manifest.push(`assets/${color}/${value}.png`);
        }
    }
    for (const value of BLACK_VALUES) {
        manifest.push(`assets/black/${value}.png`);
    }
    manifest.push('assets/backside.png');
    return manifest;
}

function loadImages(manifest) {
    const images = {};
    const promises = manifest.map(path => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = path;
            img.onload = () => resolve({ path, img });
            img.onerror = reject;
        });
    });
    return Promise.all(promises).then(results => {
        for (const { path, img } of results) {
            // Parse path: assets/red/7.png -> images.red['7']
            const parts = path.split('/');
            if (parts[1] === 'backside.png') {
                images['backside'] = img;
            } else {
                const color = parts[1];
                const value = parts[2].replace('.png', '');
                if (!images[color]) images[color] = {};
                images[color][value] = img;
            }
        }
        return images;
    });
}

const manifest = getImageManifest();
let images = {};

loadImages(manifest).then(loadedImages => {
    images = loadedImages;
    imagesLoaded = true;
    window.addEventListener('resize', drawFrame);
    drawFrame();
});

function resizeCanvas () {
    screen.width = window.innerWidth;
    screen.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
}

function drawFrame (){
    resizeCanvas();
    ctx.clearRect(0, 0, screen.width, screen.height);
    drawHand(hand);
    drawOppHands(oppHands);
}

function drawHand (hand) {
    const step = 20*scaleFactor;
    const handWidth = 48*scaleFactor+(hand.length-1)*step;
    const startX = Math.round((screen.width-handWidth)/2);
    const y = screen.height-70*scaleFactor;

    let x = startX;
    hand.forEach(card => {
        let color = card[0];
        let value = card.slice(1);
        switch(color) {
            case 'r':
                color = 'red';
                break;
            case 'b':
                color = 'blue';
                break;
            case 'g':
                color = 'green';
                break;
            case 'y':
                color = 'yellow';
                break;
            case 's':
                color = 'black';
        }
        ctx.drawImage(images[color][value], x, y, 48*scaleFactor, 64*scaleFactor);
        x+=step;
    });

}

function drawOppHands (oppHands) {
    let sideNum;
    if (oppHands.length == 0) {
        sideNum = 0;
    } else if (oppHands.length >= 1 && oppHands.length <= room.maxPlayers-2) {
        sideNum = Math.floor((oppHands.length-1)/2);
        console.log();
    } else {
        sideNum = Math.floor((room.maxPlayers-3)/2);
    }

    let left = [];
    let right = [];
    let top = [];
    if (sideNum != 0){
        left = oppHands.slice(0, sideNum);
        right = oppHands.slice(-sideNum);
        top = oppHands.slice(sideNum, -sideNum);
    } else {
        top = oppHands.slice();
    }

    // left
    const distY = screen.height/(left.length+1);
    for(let i = 0; i < left.length; i++) {
        for(let j = 0; j < left[i]; j++) {
            ctx.drawImage(images.backside, j*16*scaleFactor, distY-32*scaleFactor+i*distY, 48*scaleFactor, 64*scaleFactor);
        }
    }

    //right
    for(let i = 0; i < right.length; i++) {        
        for(let j = 0; j < right[i]; j++) {
            ctx.drawImage(images.backside, screen.width-(48*scaleFactor+(j*16*scaleFactor)), distY-32*scaleFactor+i*distY, 48*scaleFactor, 64*scaleFactor);
        }
    }

    //top
    const distX = screen.width/(top.length+1);
    for(let i = 0; i < top.length; i++) {
        const handCenter = distX*(i+1);
        const handWidth = 48*scaleFactor+(top[i]-1)*16*scaleFactor;
        const beginning = handCenter-handWidth/2;
        for(let j = 0; j < top[i]; j++) {
            ctx.drawImage(images.backside, beginning+j*16*scaleFactor, 6*scaleFactor, 48*scaleFactor, 64*scaleFactor);
        }
    }
}

// TODO
//function drawPiles () {}
