let app;
let x = 0;
let y = 0;

let started = false;
let infoLock = false;
let ctrlIsPressed = false;
let lastLocked = null;
let autoScroll = true;

const BLOCK_SIZE = 20;
const PADDING = 2;
const LINE_SPACING = 4;
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
    HEXToVBColor("#3b68ff"),    // SQUARE_TYPE_CONFIRMED_TX
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

let hashes = [];
let hashIndexmap = {};

// Ws list and set(with indices)
let wss = [];
let wssmap = {};    // ws url -> ws index in wss

let maxHeight = 0;

class Ws {
    constructor(url) {
        this.url = url;
        this.txs = [];
        this.hashTxMap = {};
        // child -> parents
        this.edgeMap = {};
        this.index = null;
    }
}

class Tx {
    constructor(hash, type, index) {
        this.hash = hash;
        this.type = type;
        this.index = index;
        this.square = null;
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


function addWs(ws) {
    if (wssmap[ws.url] === undefined) {
        wssmap[ws.url] = wss.length;
        ws.index = wss.length;
        wss.push(ws);
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
    for (let ws in wss) {
        updateTx(txhash, txtype, ws, highlighting);
    }
}

/**
 *
 * @param tx json object
 * @param txtype
 * @param wsObject
 * @param highlighting 0 don't change (default 1), 1 no, 2 yes
 */
function updateTx(txhash, txtype, wsObject, highlighting, raw) {

    let index = 0;
    if (hashIndexmap[txhash] === undefined) {
        // totally new tx
        hashIndexmap[txhash] = hashes.length;
        index = hashes.length;
        hashes.push(txhash);
    } else {
        index = hashIndexmap[txhash];
    }

    if (wsObject.hashTxMap[txhash] === undefined) {
        let v = new Tx(txhash, txtype, index);
        wsObject.hashTxMap[txhash] = v;
        wsObject.txs.push(v);
    }

    let v = wsObject.hashTxMap[txhash];
    v.type = txtype;

    let square;
    let highlightStatus = 1;
    let raws = raw;

    if (v.square !== null) {
        highlightStatus = v.square.highlighting;
        raws = v.square.raw;
        app.stage.removeChild(v.square);
        v.square = null;
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
    square.tx = v;
    square.ws = wsObject;
    square.interactive = true;
    square.buttonMode = true;
    square.raw = raws;
    square.highlighting = highlightingValue;


    square.click = function () {
        infoLock = ctrlIsPressed;
        if (lastLocked != null) {
            updateTxForAllWs(lastLocked.tx.hash, lastLocked.tx.type, lastLocked.tx, HIGHLIGHT_OFF);
            updateAncestorsHighlightAllWs(lastLocked.tx, HIGHLIGHT_OFF);
            lastLocked = null;
        }

        if (infoLock) {
            lastLocked = square;
            updateTxForAllWs(lastLocked.tx.hash, lastLocked.tx.type, lastLocked.tx, HIGHLIGHT_LOCKED);
            updateAncestorsHighlightAllWs(lastLocked.tx, HIGHLIGHT_ON);
        }

        $("#detail1").text(JSON.stringify(square.raw));
        $("#detail2").text(JSON.stringify(square.raw));
    };
    square.mouseover = function () {
        if (!infoLock) {
            $("#detail1").text(JSON.stringify(square.raw));
            updateAncestorsHighlightAllWs(square.tx, HIGHLIGHT_ON);
        }
        $("#detail2").text(JSON.stringify(square.raw));
    };
    square.mouseout = function () {
        if (!infoLock) {
            updateAncestorsHighlightAllWs(square.tx, HIGHLIGHT_OFF);
        }
    };

    let xy = getXY(v.index, wsObject.index);
    square.x = xy[0];
    square.y = xy[1];
    ensureSize();
    v.square = square;
    app.stage.addChild(square);

    if (hashes.length > 5000) {
        resetGraph();
    }

    if (autoScroll) {
        scrollSmoothToBottom('paint')
    }
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

function resetGraph() {
    globalTx = 0;
    hashes = [];
    hashIndexmap = {};

    maxHeight = 0;

    while (app.stage.children[0]) {
        app.stage.removeChild(app.stage.children[0]);
    }
}

function refreshWs(wsURLs) {
    resetGraph();

    wss = [];
    wssmap = {};

    // connect all wss
    for (let wsi = wsURLs.length - 1; wsi >= 0; wsi--) {
        let url = wsURLs[wsi];
        connect(url);
    }
    wss.sort()
}

function updateAllXY() {
    maxHeight = 0;

    for (let wsObject of wss) {
        for (let tx of wsObject.txs) {
            let xy = getXY(hashIndexmap[tx.hash], wsObject.index);
            tx.square.x = xy[0];
            tx.square.y = xy[1];
        }
    }
}


// websocket part
function connect(url) {
    let wsObject = new Ws(url);
    let ws = new WebSocket(url);
    ws.onopen = function () {
        started = true;
        // subscribe to some channels
        ws.send(JSON.stringify({"event": "new_unit"}));
        ws.send(JSON.stringify({"event": "confirmed"}));
        addWs(wsObject);
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

    function handleMessage(data) {
        let d = JSON.parse(data);
        switch (d.type) {
            case "new_unit":
                for (let txi = d.nodes.length - 1; txi >= 0; txi--) {
                    updateTx(d.nodes[txi].data.unit, getTxType(d.nodes[txi].type, false), wsObject, HIGHLIGHT_NO_CHANGE, d.nodes[txi])
                }
                for (let edgei = d.edges.length - 1; edgei >= 0; edgei--) {

                    if (wsObject.edgeMap[d.edges[edgei].source] === undefined) {
                        wsObject.edgeMap[d.edges[edgei].source] = [];
                    }
                    wsObject.edgeMap[d.edges[edgei].source].push(d.edges[edgei].target);
                }
                break;
            case "confirmed":
                for (let txi = d.nodes.length - 1; txi >= 0; txi--) {
                    updateTx(d.nodes[txi].data.unit, getTxType(d.nodes[txi].type, true), wsObject, HIGHLIGHT_NO_CHANGE, d.nodes[txi])
                }
                break;
        }
    }

    ws.onmessage = function (e) {
        // console.log('Message:', e.data);
        handleMessage(e.data);
    };

    ws.onclose = function (e) {
        console.info("Socket closed: " + url)
    };

    ws.onerror = function (err) {
        ws.close();
    };
}

function updateAncestorsHighlightAllWs(currentTx, highlight){
    for (let wsObject of wss){
        updateAncestorsHighlight(currentTx, highlight, wsObject);
    }
}

function updateAncestorsHighlight(currentTx, highlight, wsObject) {
    let currentTxHashes = new Set();
    currentTxHashes.add(currentTx.hash);

    while (currentTxHashes.size !== 0) {
        let nextTxs = new Set();
        for (let hash of currentTxHashes) {
            let tx = wsObject.hashTxMap[hash];
            if (tx === undefined) {
                continue;
            }

            if (hash !== currentTx.hash) {
                updateTx(hash, tx.type, wsObject, highlight);
            }

            if (wsObject.edgeMap[hash] === undefined) {
                continue;
            }
            for (let target of wsObject.edgeMap[hash]) {
                nextTxs.add(target);
            }
        }
        currentTxHashes = nextTxs;
    }
}

function scrollSmoothToBottom(id) {
    $('html, body').animate({scrollTop: $(document).height()}, 'slow');

}

$(window).scroll(function () {
    autoScroll = $(window).scrollTop() + $(window).height() === $(document).height();
});