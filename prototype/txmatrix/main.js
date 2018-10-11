let app;
let x = 0;
let y = 0;

let started = false;

const BLOCK_SIZE = 30;
const PADDING = 2;
const LINE_SPACING = 15;
const TOP_SPACE = 65;

/**
 * @return {number}
 */
function HEXToVBColor(rrggbb) {
    return parseInt(rrggbb.substr(1, 6), 16);
}


const sol_base = [
    HEXToVBColor("#000000"),    // SQUARE_TYPE_UNKNOWN
    HEXToVBColor("#9775AA"),    // SQUARE_TYPE_PENDING_TX
    HEXToVBColor("#3D1255"),    // SQUARE_TYPE_CONFIRMED_TX
    HEXToVBColor("#FF5C5C"),    // SQUARE_TYPE_SEQUENCER
    HEXToVBColor("#B20000"),    // SQUARE_TYPE_CONFIRMED_SEQUENCER
    HEXToVBColor("#2274A5"),    //
    HEXToVBColor("#FFBF00"),
    HEXToVBColor("#DBFF33"),


];

const SQUARE_TYPE_UNKNOWN = 0;
const SQUARE_TYPE_PENDING_TX = 1;
const SQUARE_TYPE_CONFIRMED_TX = 2;
const SQUARE_TYPE_SEQUENCER = 3;
const SQUARE_TYPE_CONFIRMED_SEQUENCER = 4;

let globalTx = 0;

// Tx list and set
let txs = [];
let txsmap = {};

// Ws list and set(with indices)
let wss = [];
let wssmap = {};

let maxHeight = 0;


class Tx {
    constructor(hash, type, index) {
        this.hash = hash;
        this.type = type;
        // indices of Ws in wss
        this.wss = [];
        this.index = index;
        this.squares = [];
    }
}

class Ws {
    constructor(ws) {
        this.ws = ws;
    }
}

function init() {
    app = new PIXI.Application(800, 600, {antialias: true, autoResize: true});

    app.renderer.view.style.position = "absolute";
    app.renderer.view.style.display = "block";
    app.renderer.view.style.width = window.innerWidth + "px";
    app.renderer.view.style.height = (window.innerHeight - TOP_SPACE) + "px";

    app.renderer.backgroundColor = 0xFFFFFF;
    app.view.id = "main";
    $("#paint").append(app.view);

    // app.ticker.add(delta => function(delta){
    //     draw();
    // }(delta));
}

function addWs(wsURL) {
    if (wssmap[wsURL] === undefined) {
        wssmap[wsURL] = wss.length;
        wss.push(wsURL);
    }
}

function getXY(tx_index, ws_index) {
    let lineSize = Math.floor(window.innerWidth / (BLOCK_SIZE + PADDING));
    let y = Math.floor(tx_index / lineSize);
    let x = tx_index - y * lineSize;
    // real coordinate
    x = x * (BLOCK_SIZE + PADDING);
    y = y * wss.length * (BLOCK_SIZE + PADDING) + y * LINE_SPACING + ws_index * (BLOCK_SIZE + PADDING);
    maxHeight = Math.max(maxHeight, y + BLOCK_SIZE + PADDING + LINE_SPACING);
    return [x, y];
}

function updateTx(txhash, txtype, wsi, tx) {
    if (txsmap[txhash] === undefined) {
        let v = new Tx(txhash, txtype, txs.length);
        txsmap[txhash] = v;
        txs.push(v);
    }
    let v = txsmap[txhash];

    let square;
    if (v.wss.includes(wsi)) {
        square = v.squares[wsi];
        app.stage.removeChild(square);
        app.render();
    } else {
        v.wss.push(wsi);
    }
    square = getSquare(txtype);
    square.txi = v.index;
    square.wsi = wsi;
    square.interactive = true;
    square.buttonMode = true;
    square.tx = tx;

    square.on('click', function () {
        $("#detail").text(JSON.stringify(square.tx));
        // console.log("click", txs[this.txi].hash);
    });
    square.on('mouseover', function () {
        $("#detail").text(JSON.stringify(square.tx));
        // console.log("hover", this.x, this.y);
    });
    let xy = getXY(v.index, wsi);
    square.x = xy[0];
    square.y = xy[1];
    // console.log(txhash, txtype, ws, xy);
    ensureSize();
    v.squares.push(square);
    app.stage.addChild(square);
}

function getSquare(type) {
    const graphics = new PIXI.Graphics();

    // set a fill and a line style again and draw a rectangle
    // graphics.lineStyle(2, 0x0000FF, 1);
    let color = sol_base[type];

    graphics.beginFill(color, 1);
    graphics.drawRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
    graphics.endFill();
    return graphics;
}

function sample() {
    updateTx("0x0001" + globalTx, 0, "c1");
    updateTx("0x0001" + globalTx, 0, "c2");
    updateTx("0x0001" + globalTx, 0, "c3");
    updateTx("0x0002" + globalTx, 1, "c1");
    updateTx("0x0002" + globalTx, 1, "c2");
    updateTx("0x0003" + globalTx, 2, "c3");
    updateTx("0x0003" + globalTx, 2, "c2");
    globalTx += 1;
}


init();

function refreshWs(wsURLs) {
    globalTx = 0;
// Tx list and set
    txs = [];
    txsmap = {};
// Ws list and set(with indices)
    wss = [];
    wssmap = {};
    maxHeight = 0;

    while (app.stage.children[0]) {
        app.stage.removeChild(app.stage.children[0]);
    }

    // connect all wss
    for (let wsi = wsURLs.length - 1; wsi >= 0; wsi--) {
        let url = wsURLs[wsi];
        connect(url);
    }
}

function updateAllXY() {
    maxHeight = 0;
    for (let i = txs.length - 1; i >= 0; i--) {
        let tx = txs[i];
        for (let j = tx.squares.length - 1; j >= 0; j--) {
            let square = tx.squares[j];
            let xy = getXY(square.txi, square.wsi);
            square.x = xy[0];
            square.y = xy[1];
        }
    }
}

function ensureSize() {
    let my = Math.max(maxHeight, window.innerHeight - TOP_SPACE);
    app.view.height = my;
    app.view.width = window.innerWidth;
    app.renderer.resize(window.innerWidth, my);
    // console.log("new viewport", app.view.height, app.view.width);
}

window.onresize = function (event) {
    // console.log("window resized");
    updateAllXY();
    ensureSize();
};


// websocket part
function connect(url) {
    let ws = new WebSocket(url);
    ws.onopen = function () {
        started = true;
        // subscribe to some channels
        ws.send(JSON.stringify({"event": "new_unit"}));
        ws.send(JSON.stringify({"event": "confirmed"}));
        addWs(url);
    };

    function getTxType(str, confirmed = false) {
        switch (str) {
            case "":
                return confirmed ? SQUARE_TYPE_CONFIRMED_TX : SQUARE_TYPE_PENDING_TX;
            case "sequencer_unit":
                return confirmed ? SQUARE_TYPE_CONFIRMED_SEQUENCER : SQUARE_TYPE_SEQUENCER;
            default:
                return SQUARE_TYPE_UNKNOWN;
        }
    }

    function handleMessage(wsi, data) {
        let d = JSON.parse(data);
        switch (d.type) {
            case "new_unit":
                for (let nodei = d.nodes.length - 1; nodei >= 0; nodei--) {
                    updateTx(d.nodes[nodei].data.unit, getTxType(d.nodes[nodei].type, false), wsi, d.nodes[nodei])
                }
                break;
            case "confirmed":
                for (let nodei = d.nodes.length - 1; nodei >= 0; nodei--) {
                    updateTx(d.nodes[nodei].data.unit, getTxType(d.nodes[nodei].type, true), wsi, d.nodes[nodei])
                }
                break;
        }
    }

    ws.onmessage = function (e) {
        // console.log('Message:', e.data);
        handleMessage(wssmap[url], e.data);
    };

    ws.onclose = function (e) {
        if (wssmap[url] === undefined && started) {
            // never succeed. ignore it
            return;
        }
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        setTimeout(function () {
            connect(url);
        }, 1000);
    };

    ws.onerror = function (err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        ws.close();
    };
}

