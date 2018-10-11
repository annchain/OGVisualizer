let app;
let x = 0;
let y = 0;

let started = false;
let infoLock = false;
let ctrlIsPressed = false;
let lastLocked = null;

const BLOCK_SIZE = 30;
const PADDING = 2;
const LINE_SPACING = 15;
const TOP_SPACE = 65;
const HIGHLIGHT_BORDER_WIDTH = 2;

/**
 * @return {number}
 */
function HEXToVBColor(rrggbb) {
    return parseInt(rrggbb.substr(1, 6), 16);
}

const highlighingColor = HEXToVBColor("#000");
const lockedColor = HEXToVBColor("#660284");

const sol_base = [
    HEXToVBColor("#000000"),    // SQUARE_TYPE_UNKNOWN
    HEXToVBColor("#b5d1ff"),    // SQUARE_TYPE_PENDING_TX
    HEXToVBColor("#7aacff"),    // SQUARE_TYPE_CONFIRMED_TX
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

const HIGHLIGHT_NO_CHANGE = 0;
const HIGHLIGHT_ON = 1;
const HIGHLIGHT_OFF = 2;
const HIGHLIGHT_LOCKED = 3;

let globalTx = 0;

// Tx list and set
let txs = [];
let txsmap = {};    // tx hash -> Tx

// Ws list and set(with indices)
let wss = [];
let wssmap = {};    // ws url -> ws index in wss

let edges = {};      // child -> parents
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

$(document).keydown(function (event) {
    if (event.which === 17) {
        ctrlIsPressed = true;
    }
});

$(document).keyup(function () {
    ctrlIsPressed = false;
});


function init() {
    app = new PIXI.Application(800, 600, {antialias: true, autoResize: true, backgroundColor: 0xFFFFFF});
    app.view.id = "main";
    $("#paint").append(app.view);
    // app.ticker.add(delta => function(delta){
    //     draw();
    // }(delta));
}

function ensureSize() {
    const parent = app.view.parentNode;
    let my = Math.max(maxHeight, parent.clientHeight - TOP_SPACE);
    app.renderer.resize(parent.clientWidth, my);
}

window.onresize = function (event) {
    // console.log("window resized");
    updateAllXY();
    ensureSize();
};


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


function updateTxForAllWs(txhash, txtype, tx, highlighting) {
    let v = txsmap[txhash];
    for (let wsi of v.wss) {
        updateTx(txhash, txtype, wsi, tx, highlighting);
    }
}

/**
 *
 * @param txhash
 * @param txtype
 * @param wsi
 * @param tx json object
 * @param highlighting 0 don't change (default 1), 1 no, 2 yes
 */
function updateTx(txhash, txtype, wsi, tx, highlighting) {
    if (txsmap[txhash] === undefined) {
        let v = new Tx(txhash, txtype, txs.length);
        txsmap[txhash] = v;
        txs.push(v);
    }
    let v = txsmap[txhash];
    v.type = txtype;

    let square;
    let highlightStatus = 1;
    let pos = v.wss.indexOf(wsi);
    if (pos !== -1) {
        square = v.squares[pos];
        highlightStatus = square.highlighting;
        v.squares.splice(pos, 1);
        app.stage.removeChild(square);
    } else {
        v.wss.push(wsi);
    }
    let highlightingValue;

    switch (highlighting) {
        case HIGHLIGHT_NO_CHANGE:
            highlightingValue = highlightStatus;
            break;
        default:
            highlightingValue = highlighting;
    }

    square = getSquare(txtype, highlighting);
    square.txi = v.index;
    square.wsi = wsi;
    square.interactive = true;
    square.buttonMode = true;
    square.tx = tx;
    square.txv = v;
    square.highlighting = highlightingValue;


    square.click = function () {
        infoLock = ctrlIsPressed;
        if (lastLocked != null) {
            updateTxForAllWs(lastLocked.txv.hash, lastLocked.txv.type, lastLocked.tx, HIGHLIGHT_OFF);
            updateAncestorsHighlight(lastLocked.txv, HIGHLIGHT_OFF);
            lastLocked = null;
        }

        if (infoLock) {
            lastLocked = square;
            updateTxForAllWs(lastLocked.txv.hash, lastLocked.txv.type, lastLocked.tx, HIGHLIGHT_LOCKED);
            updateAncestorsHighlight(lastLocked.txv, HIGHLIGHT_ON);
        }

        $("#detail1").text(JSON.stringify(square.tx));
        $("#detail2").text(JSON.stringify(square.tx));
    };
    square.mouseover = function () {
        if (!infoLock) {
            $("#detail1").text(JSON.stringify(square.tx));
            updateAncestorsHighlight(square.txv, HIGHLIGHT_ON);
        }
        $("#detail2").text(JSON.stringify(square.tx));
    };
    square.mouseout = function () {
        if (!infoLock) {
            updateAncestorsHighlight(square.txv, HIGHLIGHT_OFF);
        }
    };

    let xy = getXY(v.index, wsi);
    square.x = xy[0];
    square.y = xy[1];
    ensureSize();
    v.squares.splice(v.wss.indexOf(wsi), 0, square);
    app.stage.addChild(square);
}

function getSquare(type, highlighting) {
    const graphics = new PIXI.Graphics();

    // set a fill and a line style again and draw a rectangle
    // graphics.lineStyle(2, 0x0000FF, 1);
    let color = sol_base[type];

    if (highlighting === HIGHLIGHT_ON) {
        graphics.beginFill(highlighingColor, 1);
        graphics.drawRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
        graphics.endFill();

        graphics.beginFill(color, 1);
        graphics.drawRect(HIGHLIGHT_BORDER_WIDTH, HIGHLIGHT_BORDER_WIDTH, BLOCK_SIZE - 2 * HIGHLIGHT_BORDER_WIDTH, BLOCK_SIZE - 2 * HIGHLIGHT_BORDER_WIDTH);
        graphics.endFill();
    } else if (highlighting === HIGHLIGHT_LOCKED) {
        graphics.beginFill(lockedColor, 1);
        graphics.drawRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
        graphics.endFill();

        graphics.beginFill(color, 1);
        graphics.drawRect(HIGHLIGHT_BORDER_WIDTH, HIGHLIGHT_BORDER_WIDTH, BLOCK_SIZE - 2 * HIGHLIGHT_BORDER_WIDTH, BLOCK_SIZE - 2 * HIGHLIGHT_BORDER_WIDTH);
        graphics.endFill();
    } else {
        graphics.beginFill(color, 1);
        graphics.drawRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
        graphics.endFill();
    }


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
                    updateTx(d.nodes[nodei].data.unit, getTxType(d.nodes[nodei].type, false), wsi, d.nodes[nodei], HIGHLIGHT_NO_CHANGE)
                }
                for (let edgei = d.edges.length - 1; edgei >= 0; edgei--) {
                    if (edges[d.edges[edgei].source] === undefined) {
                        edges[d.edges[edgei].source] = [];
                    }
                    edges[d.edges[edgei].source].push(d.edges[edgei].target);
                }
                break;
            case "confirmed":
                for (let nodei = d.nodes.length - 1; nodei >= 0; nodei--) {
                    updateTx(d.nodes[nodei].data.unit, getTxType(d.nodes[nodei].type, true), wsi, d.nodes[nodei], HIGHLIGHT_NO_CHANGE)
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

function updateAncestorsHighlight(currentTx, highlight) {
    let currentTxs = new Set();
    currentTxs.add(currentTx.hash);

    while (currentTxs.size !== 0) {
        let nextTxs = new Set();
        for (let tx of currentTxs) {
            let ptx = txsmap[tx];
            if (ptx === undefined) {
                continue;
            }
            // txhash, txtype, wsi, tx, highlighting
            // never update myself.
            if (ptx.hash !== currentTx.hash) {
                for (let wssi = ptx.wss.length - 1; wssi >= 0; wssi--) {
                    updateTx(ptx.hash, ptx.type, ptx.wss[wssi], ptx.squares[wssi].tx, highlight);
                }
            }

            if (edges[ptx.hash] === undefined) {
                continue;
            }
            for (let target of edges[ptx.hash]) {
                nextTxs.add(target);
                console.log(target);
            }
        }
        currentTxs = nextTxs;

    }
}