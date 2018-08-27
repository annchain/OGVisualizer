var socketURL = 'https://tanglemonitor.com:4434';
var socket = io(socketURL);

var cy;
var tx_list = [];

initSocket();

function createCy(){
     cy = cytoscape({
        container: document.getElementById('cy'),
        boxSelectionEnabled: false,
        autounselectify: true,
        layout:{
            name:'preset'
        },
        style:[
            {
                selector: 'node',
				style: {
					'content': 'data(unit_s)',
					'text-opacity': 1,
					'min-zoomed-font-size': 13,
					'text-valign': 'bottom',
					'text-halign': 'center',
					'font-size': '13px',
					'text-margin-y': '5px',
					'background-color': '#fff',
					'border-width': 1,
					'border-color': '#2980b9',
					//	'border-color': '#333',
					//	'border-style': 'dotted',
					'width': 25,
					'height': 25
				}
            },
            {
                selector: 'node.hover',
				style: {
					'content': 'data(id)',
					'text-opacity': 1,
					'font-weight': 'bold',
					'font-size': '14px',
					'text-background-color': '#fff',
					'text-background-opacity': 1,
					'text-background-shape': 'rectangle',
					'text-border-opacity': 1,
					'text-border-width': 4,
					'text-border-color': '#fff',
                    'z-index': 9999
                }
            },
            {
				selector: 'edge',
				style: {
					'width': 2,
					'target-arrow-shape': 'triangle',
					'line-color': '#2980b9',
					'target-arrow-color': '#2980b9',
					'curve-style': 'bezier'
				}
			}
        ],
        elements: {
			nodes: [],
			edges: []
		}
    })
    cy.on('mouseover', 'node', function() {
		this.addClass('hover');
	});

	cy.on('mouseout', 'node', function() {
		this.removeClass('hover');
	});
}

function set_new_point(){
    var data = {};
    data.nodes = [];
    data.edges = {};
    var data1 = {
        unit : '/3WhIDCv2Ki2z+HGeknnGW2LOsXgketPUK3dtawgdek=',
        unit_s : '/3WhIDC...'
    }
    var a = {
        data : data1,
        is_on_main_chain : 1,
        is_stable : 0,
        rowid : 4071777,
        sequence : "good"
    }
    data.nodes.push(a);
    var data2 = {
        unit : '/8AAIDCv2Ki2z+HGeknnGW2LOsXgketPUK3dtawgdek=',
        unit_s : '/3AAIDC...'
    }
    var b = {
        data : data2,
        is_on_main_chain : 1,
        is_stable : 0,
        rowid : 4071778,
        sequence : "good"
    }
    data.nodes.push(b);
    data3 = {
        id :"99031584-2b04-42c8-82f3-efdc4a241ba8",
        source : "/3WhIDCv2Ki2z+HGeknnGW2LOsXgketPUK3dtawgdek=",
        target : "/8AAIDCv2Ki2z+HGeknnGW2LOsXgketPUK3dtawgdek="
    }
    data.edges.data = {
        best_parent_unit : true,
        data:data3,
    }
    console.log(data);
    var graph = new dagre.graphlib.Graph({
		multigraph: true,
		compound: true
    });
    graph.setGraph({});
    graph.setDefaultEdgeLabel(function() {
		return {};
    });
    data.nodes.forEach(function(node) {
		graph.setNode(node.data.unit, {
			label: node.data.unit_s,
			width: 32,
			height: 32,
			is_on_main_chain: node.is_on_main_chain,
			is_stable: node.is_stable,
			sequence: node.sequence
		});
    });
    for (var k in data.edges) {
		if (data.edges.hasOwnProperty(k)) {
			graph.setEdge(data.edges[k].data.source, data.edges[k].data.target);
		}
	}
    dagre.layout(graph);
    console.log(graph);
    return graph;
}

// 初始化 websocket
function initSocket(){
    socket.on('connect',function(){
        if(socket.connected){
            var websocketActive = true;
            console.log(`Successfully connected to Websocket.. [websocketActive: ${websocketActive}] ID:`,socket.id);
        }else{
            console.log('something worng..');
        }
    })
}

function start(){
    createCy();
    set_new_point();
    cy.viewport({zoom: 1.01});
	cy.center(cy.nodes()[0]);
	page = 'dag';
    // read_new_Tx();
    // read_update_Tx();
    console.log(tx_list);
}

function pause(){
    console.log('in pause');
    socket.on('disconnect',function(reasion){
        console.log('##############');
        console.log(reasion);
        console.log('##############');
    });
}

function read_new_Tx(){
    socket.on('newTX',function(newTX){
        tx_list.push(newTX);
    })
}

function read_update_Tx(){
    socket.on('update', function(update) {
        update_Tx(update, 'txConfirmed');
    });
}

function update_Tx(update, updateType){
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
