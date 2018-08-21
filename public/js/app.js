var socketURL = 'https://tanglemonitor.com:4434';
var socket = io(socketURL);

var tx_list = [];

initSocket();

function initSocket(){
    socket.on('connect',function(){
        if(socket.connected){
            console.log('Successfully connected to Websocket.. ID:',socket.id);
        }else{
            console.log('something worng..');
        }
    })
}

function start(){
    readNewTx();
    readUpdateTx();
    console.log(tx_list);
}

function pause(){
    socket.on('disconnect',function(){});
}

function readNewTx(){
    socket.on('newTX',function(newTX){
        tx_list.push(newTX);
    })
}

function readUpdateTx(){
    socket.on('update', function(update) {
        updateTXStatus(update, 'txConfirmed');
    });
}

function updateTXStatus(update, updateType){
    console.log("in update");
    var txHash = update.hash;
    var milestoneType = update.milestone;
    var confirmationTime = update.ctime;

    var hashIndex = tx_list.findIndex(tx => tx.hash === txHash);
    console.log(hashIndex)
    if (hashIndex !== -1 && tx_list[hashIndex] !== undefined) {
        if (updateType === 'txConfirmed' || updateType === 'Milestone') {
            tx_list[hashIndex].ctime = confirmationTime;
            tx_list[hashIndex].confirmed = true;
        }
        if (updateType === 'Milestone') {
            tx_list[hashIndex].milestone = milestoneType;
        }
        if (updateType === 'Reattach') {
            tx_list[hashIndex].reattached = true;
        }
    }else{
        console.log(`${updateType === 'Milestone' ? 'Milestone' : 'TX'} not found in local DB - Hash: ${txHash} | updateType: ${updateType}`);
    }
    consoleTx();
}

function consoleTx(){
    for(var i=0;i<tx_list.length;i++){
        if(tx_list[i].confirmed){
            console.log("@@@@@@@@@@@",tx_list[i])
        }
    }
}