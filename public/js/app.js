function initSocket(socketURL){
    var socket = io(socketURL);
    socket.on('connect',function(){
        console.log('Successfully connected to Websocket..');
    })
    // socket.on('newTX',function(newTX){
    //     console.log(newTX);
    // })
    // socket.on('disconnect', reason => {
    //     console.log('WebSocket disconnect');
    //   });
}
var url = 'https://tanglemonitor.com:4434';
initSocket(url);