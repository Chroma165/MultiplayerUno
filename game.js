const socket = io();

const user = JSON.parse(sessionStorage.getItem('user'));

let room;

const hand = ['r0', 'r1', 'r2', 'r3'];
const oppHands = [];

socket.emit('joinSocketRoom', user);

socket.emit('getRoomInfo', (r) => {
    if (!r) {
        window.location.href = 'error.html';
        return;
    }
    room = r;
});


const screen = document.querySelector('#screen');
const ctx = screen.getContext('2d');
ctx.imageSmoothingEnabled = false;
const scaleFactor = 3;

resizeCanvas();


const COLORS = ['red', 'green', 'blue', 'yellow'];
const VALUES = ['0','1','2','3','4','5','6','7','8','9','r','s','+2'];
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
    ctx.drawImage(images.red['2'], 0, 0, 48*scaleFactor, 64*scaleFactor);
    drawHand();
}

function drawHand () {
    let hand = ['y0', 'b+2', 'swild', 's+4', 'br'];
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


// TODO
//function drawOppHands () {}
//function drawPiles () {}
