var socketURL = 'https://tanglemonitor.com:4434';
var socket = io(socketURL);

var cy;
var nodes, edges;
var tx_list = [];
var phantoms = {};
var phantomsTop = {};

var scroll = $('#scroll');
var scrollTopPos = 0, scrollLowPos;

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
    
    $(cy.container()).on('wheel mousewheel', function(e) {
		var deltaY = e.originalEvent.wheelDeltaY || -e.originalEvent.deltaY;
		if (page == 'dag') {
			e.preventDefault();
			if (deltaY > 0) {
				//scrollUp();
			}
			else if (deltaY < 0) {
				cy.panBy({x: 0, y: -25});
			}
			scroll.scrollTop(convertPosPanToPosScroll());
		}
	});
}

function createGraph(){
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
    nodes = data.nodes;
    edges = data.edges;
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

function generate() {
	var generateOffset = 0,newOffset_x, newOffset_y, left = Infinity, right = -Infinity, first = false, generateAdd = [], _node,
		classes = '', pos_iomc;
	var graph = createGraph();
	graph.nodes().forEach(function(unit) {
		_node = graph.node(unit);
		if (_node) {
			if (_node.x < left) left = _node.x;
			if (_node.x > right) right = _node.x;
		}
	});
	graph.nodes().forEach(function(unit) {
		_node = graph.node(unit);
		if (_node) {
			classes = '';
			if (_node.is_on_main_chain) classes += 'is_on_main_chain ';
			if (_node.is_stable) classes += 'is_stable ';
			if (_node.sequence === 'final-bad') classes += 'finalBad';
			if (_node.sequence === 'temp-bad') classes += 'tempBad';
			if (!first) {
				newOffset_x = -_node.x - ((right - left) / 2);
				newOffset_y = generateOffset - _node.y + 66;
				first = true;
			}
			if (phantoms[unit] !== undefined) {
				cy.remove(cy.getElementById(unit));
				generateAdd.push({
					group: "nodes",
					data: {id: unit, unit_s: _node.label},
					position: {x: phantoms[unit], y: _node.y + newOffset_y},
					classes: classes
				});
				delete phantoms[unit];
			}
			else {
				pos_iomc = setMaxWidthNodes(_node.x + newOffset_x);
				if (pos_iomc == 0 && _node.is_on_main_chain == 0) {
					pos_iomc += 40;
				}
				generateAdd.push({
					group: "nodes",
					data: {id: unit, unit_s: _node.label},
					position: {x: pos_iomc, y: _node.y + newOffset_y},
					classes: classes
				});
			}
		}
	});
	generateAdd = fixConflicts(generateAdd);
	cy.add(generateAdd);
	generateOffset = cy.nodes()[cy.nodes().length - 1].position().y;
	nextPositionUpdates = generateOffset;
	cy.add(createEdges());
	updListNotStableUnit();
	updateScrollHeigth();
}

function setNew(_nodes, _edges, newUnits){
    var newOffset_x, newOffset_y, min = Infinity, max = -Infinity, left = Infinity, right = -Infinity, first = false, x,
        y, generateAdd = [], _node, classes = '', pos_iomc,newOffset = -116,phantomsTop = {},phantoms = {},
        phantomsTop = {};
	var graph = createGraph();
    graph.nodes().forEach(function(unit) {
		_node = graph.node(unit);
		if (_node) {
            console.log(_node);
			y = _node.y;
			if (y < min) min = y;
			if (y > max) max = y;
			if (_node.x < left) left = _node.x;
			if (_node.x > right) right = _node.x;
		}
    });
    graph.nodes().forEach(function(unit) {
		_node = graph.node(unit);
		if (_node) {
			classes = '';
			if (_node.is_on_main_chain) classes += 'is_on_main_chain ';
			if (_node.is_stable) classes += 'is_stable ';
			if (_node.sequence === 'final-bad') classes += 'finalBad';
			if (_node.sequence === 'temp-bad') classes += 'tempBad';
			if (!first) {
				newOffset_x = -_node.x - ((right - left) / 2);
				newOffset_y = newOffset - (max - min) + 66;
				newOffset -= (max - min) + 66;
				first = true;
				if (newUnits && _cy.extent().y1 < oldOffset) {
					//animationPanUp(max + 54);
				}
			}
			if (phantomsTop[unit] !== undefined) {
				cy.remove(cy.getElementById(unit));
				generateAdd.push({
					group: "nodes",
					data: {id: unit, unit_s: _node.label},
					position: {x: phantomsTop[unit], y: _node.y + newOffset_y},
					classes: classes
				});
				delete phantomsTop[unit];
			} else {
				pos_iomc = setMaxWidthNodes(_node.x + newOffset_x);
				if (pos_iomc == 0 && _node.is_on_main_chain == 0) {
					pos_iomc += 40;
				}
				generateAdd.push({
					group: "nodes",
					data: {id: unit, unit_s: _node.label},
					position: {x: pos_iomc, y: _node.y + newOffset_y},
					classes: classes
				});
			}
		}
    });
    generateAdd = fixConflicts(generateAdd);
    cy.add(generateAdd);
    cy.add(createEdges());  
    updListNotStableUnit();
	updateScrollHeigth(); 
}

function setMaxWidthNodes(x) {
	if (x > 500) {
		return x / (x / 500);
	}
	else if (x < -500) {
		return -((x / (x / 500)));
	}
	else {
		return x;
	}
}

function updateScrollHeigth() {
	var unitTopPos = cy.getCenterPan(cy.getElementById(nodes[0].data.unit)).y;
	var unitLowPos = cy.getCenterPan(cy.getElementById(nodes[nodes.length - 1].data.unit)).y;
	scrollTopPos = convertPosPanToPosScroll(unitTopPos, 0);
	scrollLowPos = convertPosPanToPosScroll(unitLowPos) + (scroll.height()) + 116;
	$('#scrollBody').height(convertPosPanToPosScroll(unitLowPos - unitTopPos, 0) + (scroll.height() / 2));
	setTimeout(function() {
		scroll.scrollTop(convertPosPanToPosScroll());
	}, 1);
}

function updListNotStableUnit() {
	if (!cy) return;
	notStable = [];
	cy.nodes().forEach(function(node) {
		if (!node.hasClass('is_stable')) {
			notStable.push(node.id());
		}
	});
}

function cloneObj(obj) {
	var out = {};
	for (var k in obj) {
		if (obj.hasOwnProperty(k)) {
			out[k] = obj[k];
		}
	}
	return out;
}

function createEdges() {
	var _edges = cloneObj(edges), cyEdges = cy.edges(), cyEdgesLength = cyEdges.length, k, out = [], position,
		offset = 0, offsetTop = 0, classes = '';
	for (var a = 0, l = cyEdgesLength; a < l; a++) {
		k = cyEdges[a].source() + '_' + cyEdges[a].target();
		if (_edges[k]) delete _edges[k];
	}
	for (k in phantoms) {
		cy.getElementById(k).position('y', generateOffset + 166);
	}
	for (k in phantomsTop) {
		cy.getElementById(k).position('y', newOffset - 166);
	}
	for (k in _edges) {
		if (_edges.hasOwnProperty(k)) {
			classes = '';
			classes += _edges[k].best_parent_unit ? 'best_parent_unit' : '';
			if (cy.getElementById(_edges[k].data.target).length) {
				out.push({group: "edges", data: _edges[k].data, classes: classes});
			}
			else {
				position = cy.getElementById(_edges[k].data.source).position();
				phantoms[_edges[k].data.target] = position.x + offset;
				out.push({
					group: "nodes",
					data: {id: _edges[k].data.target, unit_s: _edges[k].data.target.substr(0, 7) + '...'},
					position: {x: position.x + offset, y: generateOffset + 166}
				});
				offset += 60;
				out.push({group: "edges", data: _edges[k].data, classes: classes});
			}
			if (!cy.getElementById(_edges[k].data.source).length) {
				position = cy.getElementById(_edges[k].data.target).position();
				phantomsTop[_edges[k].data.source] = position.x + offsetTop;
				out.push({
					group: "nodes",
					data: {id: _edges[k].data.source, unit_s: _edges[k].data.source.substr(0, 7) + '...'},
					position: {x: position.x + offsetTop, y: newOffset - 166}
				});
				offsetTop += 60;
				out.push({group: "edges", data: _edges[k].data, classes: classes});
			}
		}
	}
	return out;
}

function fixConflicts(arr) {
	var conflicts = {}, a, b, l, l2;
	for (a = 0, l = arr.length; a < l; a++) {
		for (b = 0; b < l; b++) {
			if (a != b && ((arr[a].position.x < arr[b].position.x + 10 && arr[a].position.x > arr[b].position.x - 10) && arr[a].position.y == arr[b].position.y)) {
				if (!conflicts[arr[a].position.y]) conflicts[arr[a].position.y] = [];
				conflicts[arr[a].position.y].push(arr[a]);
			}
		}
	}
	for (var k in conflicts) {
		var offset = 0, units = [];
		for (b = 0, l2 = conflicts[k].length; b < l2; b++) {
			for (a = 0; a < l; a++) {
				if (arr[a].data.id == conflicts[k][b].data.id && units.indexOf(arr[a].data.id) == -1) {
					units.push(arr[a].data.id);
					if (arr[a].position.x < 0) {
						offset -= 60;
					}
					else {
						offset += 60;
					}
					arr[a].position.x += offset;
				}
			}
		}
	}
	return arr;
}

function convertPosPanToPosScroll(posY, topPos) {
	if (!posY) posY = cy.pan('y');
	if (topPos === undefined) topPos = scrollTopPos;
	return ((scroll.height() / 2) - topPos) - posY;
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
    generate();
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
