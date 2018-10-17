var cy;
var nodes, edges;
var tx_list = [];
var newOffset = -116;
var phantoms = {};
var phantomsTop = {};
var generateOffset = 0;
var notLastUnitUp = false;
var queueAnimationPanUp = [], animationPlaysPanUp = false;
var oldOffset;
var oldSet;
var zoomSet = 0.86;
var timerInfoMessage;
var tip_index = [];
var new_tip_index = [];
var old_tip_index = [];
var pending_index = [];
var comfirmed_index = [];
var sequencer_index = [];
var IF_FIRST = false;
var focus = false;
var x,y;
var pxSize = 30;
var labelSwitch = false;
var last_uint;
//init websocket host
if (url.length == 0) {
    url = config.websocket.host;
}
var ws = new WebSocket("ws://" + url);

window.onresize = function(){
	var width = document.body.clientWidth;
	var height = document.body.clientHeight;
	let a = document.querySelector("#cy");
	let b = (width * 0.68).toFixed(2) + 'px';
	console.log((document.body.clientHeight - 45) + 'px', b);
	a.style.height = b;
	a.style.width = (document.body.clientHeight - 45) + 'px';
}

var scroll = $('#scroll');
var scrollTopPos = 0, scrollLowPos;
$('#cy, #scroll, #goToTop').show();

initSocket();
var t1 = window.setTimeout(window.onresize,1000);
var t2 = window.setTimeout(start,1000);
// var t3 = window.setInterval(edges_flash,200);


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
					'background-color': '#00ffff',
					'border-width': 2,
					'border-color': '#00ffff',
					'width': pxSize,
					'height': pxSize
				}
            },
            {
				selector: 'edge',
				style: {
					'width': 6,
					'target-arrow-shape': 'triangle',
					'line-color': '#753faa',
					'target-arrow-color': '#753faa',
					'curve-style': 'bezier'
				}
			},{
				selector: '.edge_flash',
				style: {
					'width': 1,
					'target-arrow-shape': 'triangle',
					'line-color': '#42408f',
					'target-arrow-color': '#42408f',
					'curve-style': 'bezier'
				}
			},{
				selector: '.comfirmed_unit',
				style: {
					'shape':'rectangle',
					'width-width': 2,
					'border-color': '#75fb6b',
					'background-color': '#75fb6b',
					'width': pxSize+1,
					'height': pxSize+1
				}
			},{
				selector: '.comfirmed_unit_flash',
				style: {
					'shape':'rectangle',
					'width-width': 1,
					'border-color': '#e6d95f',
					'background-color': '#e6d95f',
					'width': pxSize+1,
					'height': pxSize+1
				}
			},{
				selector: '.pending_unit',
				style: {
					'border-width': 2,
					'background-color': '#1754c2',
					'border-color': '#1754c2'
				}
			},{
				selector: '.sequencer_unit',
				style: {
					'shape':'rectangle',
					'border-width': 2,
					'background-color': '#d64f5f',
					'border-color': '#d64f5f',
					'width': pxSize+3,
					'height': pxSize+3
				}
			},{
				selector: '.is_on_main_chain',
				style: {
					'background-color': '#6495ed'
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
	
	cy.on('click', 'node', function(evt) {
		location.hash = '#' + evt.cyTarget.id();
	});
    
    $(cy.container()).on('wheel mousewheel', function(e) {
		focus = true;
		var deltaY = e.originalEvent.wheelDeltaY || -e.originalEvent.deltaY;
		if (page == 'dag') {
			e.preventDefault();
			if (deltaY > 0) {
				scrollUp();
			}
			else if (deltaY < 0) {
				cy.panBy({x: 0, y: -25});
			}
			scroll.scrollTop(convertPosPanToPosScroll());
		}
	});
}

function createGraph(data){
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
			type: node.type,
		});
    });
	if (data.edges){
		data.edges.forEach(function(edge){
		})
	}
    dagre.layout(graph);
    return graph;
}

function generate(data) {
	var newOffset_x, newOffset_y, left = Infinity, right = -Infinity, first = false, generateAdd = [], _node,
		classes = '', pos_iomc;
	var graph = createGraph(data);
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
			classes += _node.type;
			if (!first) {
				newOffset_x = -_node.x - ((right - left) / 2);
				newOffset_y = generateOffset - _node.y + 22;
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
				console.log("phantoms",phantoms[unit],_node.y + newOffset_y);
				delete phantoms[unit];
			}
			else {
				pos_iomc = setMaxWidthNodes(_node.x + newOffset_x);
				if (pos_iomc == 0 || _node.type == "sequencer_unit") {
					pos_iomc += 35;
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
	generateOffset = cy.nodes()[0].position().x;
	console.log(cy.nodes()[cy.nodes().length - 1]._private.position.x,cy.nodes()[0].position().x)
	nextPositionUpdates = generateOffset;
	cy.add(createEdges());
	updListNotStableUnit();
	updateScrollHeigth();
}

function setNew(data, newUnits){
    var newOffset_x, newOffset_y,min = Infinity, max = -Infinity, left = Infinity, right = -Infinity, first = false, x,
		y, generateAdd = [], _node, classes = '', pos_iomc,phantomsTop = {},phantoms = {},target01,target02,target01_coord,target02_coord,setoff;
	// target01 = data.edges[0].target;
	// target02 = data.edges[1].target;
	// target01_coord = cy.getElementById(target01)._private.position;
	// target02_coord = cy.getElementById(target02)._private.position;
	var graph = createGraph(data);
    graph.nodes().forEach(function(unit) {
		_node = graph.node(unit);
		if (_node) {
			y = _node.y;
			if (y < min) min = y;
			if (y > max) max = y;
			if (_node.x < left) left = _node.x;
			if (_node.x > right) right = _node.x;
			if (!labelSwitch) _node.label = "";
		}
    });
    graph.nodes().forEach(function(unit) {
		_node = graph.node(unit);
		if (_node) {
			classes = '';
			classes += _node.type;
			if (!first) {
				newOffset_x = -_node.x - ((right - left) / 2);
				newOffset_y = newOffset - (max - min) + 75;
				newOffset -= (max - min) + 25;//行间距
				first = true;
				if (newUnits && cy.extent().y1 < oldOffset) {
				 	animationPanUp(max + 54);
				}
			}
			if (phantomsTop[unit] !== undefined) {
				console.log('in here');
				cy.remove(cy.getElementById(unit));
				generateAdd.push({
					group: "nodes",
					data: {id: unit, unit_s: _node.label},
					position: {x: phantomsTop[unit]+randomNum(-15,15), y: _node.y + newOffset_y+randomNum(-15,15)},
					classes: classes
				});
				delete phantomsTop[unit];
			} else {
				pos_iomc = nextPositionUpdates + randomNum(-800,400)/1.8;
				while(Math.abs(pos_iomc-oldSet)<90){
					pos_iomc = nextPositionUpdates + randomNum(-800,400)/1.8;
				}
				oldSet = pos_iomc;
				if (pos_iomc == 0 && _node.is_on_main_chain == 0) {
					pos_iomc += 20;
				}
				var XX = pos_iomc+randomNum(-15,15);
				var YY = _node.y + newOffset_y+randomNum(-15,15);
				generateAdd.push({
					group: "nodes",
					data: {id: unit, unit_s: _node.label},
					position: {x: XX, y: _node.y + YY},
					classes: classes
				});
			}
		}
		old_y = _node.y + newOffset_y;
    });
	generateAdd = fixConflicts(generateAdd);
    cy.add(generateAdd);
	cy.add(createEdges()); 
    updListNotStableUnit();
	updateScrollHeigth(); 
	flash_tx_info(data.nodes[0].data.unit);
	last_uint = data.nodes[0].data.unit;
}

//addClass
function updateClass_sequencer_unit(unit){
	cy.getElementById(unit).addClass('sequencer_unit');
}

function updateClass_comfirmed_unit(unit){
	cy.getElementById(unit).flashClass('comfirmed_unit_flash',500);
	cy.getElementById(unit).addClass('comfirmed_unit');
}

function updateClass_pending_unit(unit){
	cy.getElementById(unit).addClass('pending_unit');
}

function animationPanUp(distance) {
	if (animationPlaysPanUp) {
		queueAnimationPanUp.push(distance);
	}
	else {
		if (queueAnimationPanUp.length > 1) {
			distance = queueAnimationPanUp.reduce(function(prev, current) {
				return prev + current;
			});
			queueAnimationPanUp = [];
		}
		cy.stop();
		animationPlaysPanUp = true;
		cy.animate({
			pan: {
				x: cy.pan('x'),
				y: cy.pan('y') + distance
			}
		}, {
			duration: 250,
			complete: function() {
				oldOffset = cy.getElementById(nodes[0].data.unit).position().y + 66;
				animationPlaysPanUp = false;
				if (queueAnimationPanUp.length) {
					animationPanUp(queueAnimationPanUp[0]);
					queueAnimationPanUp.splice(0, 1);
				}
			}
		});
	}
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

function scrollUp() {
	var ext = cy.extent();
	if ((notLastUnitUp === false && ext.y2 - (ext.h / 2) > cy.getElementById(nodes[0].data.unit).position().y + 20) ||
		(notLastUnitUp === true && ext.y2 - (ext.h) > cy.getElementById(nodes[0].data.unit).position().y)
	) {
		cy.panBy({x: 0, y: 25});//scrollUp
	}
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
		cy.getElementById(k).position('y', generateOffset + 25);
	}
	for (k in phantomsTop) {
		cy.getElementById(k).position('y', newOffset - 25);
	}
	for (k in _edges) {
		if (_edges.hasOwnProperty(k)) {
			classes = '';
			classes += _edges[k].best_parent_unit ? 'best_parent_unit' : '';
			if (cy.getElementById(_edges[k].target).length) {
				out.push({group: "edges", data: _edges[k], classes: classes});
			}
			else {
				// position = cy.getElementById(_edges[k].source).position();
				// phantoms[_edges[k].target] = position.x + offset;
				// out.push({
				// 	group: "nodes",
				// 	data: {id: _edges[k].target, unit_s: _edges[k].target.substr(0, 7) + '...'},
				// 	position: {x: position.x + offset, y: generateOffset + 25},
				// 	classes : 'sequencer_unit'//first unit classes
				// });
				// offset += 60;
				// out.push({group: "edges", data: _edges[k], classes: classes});
			}
			if (!cy.getElementById(_edges[k].source).length) {
				position = cy.getElementById(_edges[k].target).position();
				phantomsTop[_edges[k].source] = position.x + offsetTop;
				out.push({
					group: "nodes",
					data: {id: _edges[k].source, unit_s: _edges[k].source.substr(0, 7) + '...'},
					position: {x: position.x + offsetTop, y: newOffset - 25}
				});
				offsetTop += 60;
				out.push({group: "edges", data: _edges[k], classes: classes});
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
						offset -= 30;
					}
					else {
						offset += 30;
					}
					arr[a].position.x += offset;
				}
			}
		}
	}
	return arr;
}

function searchForm(text) {
	console.log(text);
	if (text.length == 66 || text.length == 32 || text.length == 2) {
		location.hash = text;
	}
	else {
		showInfoMessage("Please enter a unit or address");
	}
	$('#inputSearch').val('');
}

function convertPosPanToPosScroll(posY, topPos) {
	if (!posY) posY = cy.pan('y');
	if (topPos === undefined) topPos = scrollTopPos;
	return ((scroll.height() / 2) - topPos) - posY;
}

function showHideBlock(event, id) {
	var block = $('#' + id);
	var target;
	if (event.target.classList.contains('infoTitle')) {
		target = $(event.target);
	}
	else {
		target = $(event.target.parentNode);
	}
	if (block.css('display') === 'none') {
		block.show(250);
		target.removeClass('hideTitle');
	}
	else {
		block.hide(250);
		target.addClass('hideTitle');
	}
}

function goToTop() {
	var el = cy.getElementById(nodes[0].data.unit);
		cy.stop();
		cy.animate({
			pan: {x: cy.pan('x'), y: cy.getCenterPan(el).y-300}
		}, {
			duration: 1500
		});
	focus = false;
}

function labelSwitcher(){
	labelSwitch = !labelSwitch;
}

function randomNum(minNum,maxNum){ 
    switch(arguments.length){ 
        case 1: 
            return parseInt(Math.random()*minNum+1,10); 
        break; 
        case 2: 
            return parseInt(Math.random()*(maxNum-minNum+1)+minNum,10); 
        break; 
            default: 
                return 0; 
            break; 
    } 
}

function plus(){
	zoomSet += 0.05
	cy.viewport({zoom: zoomSet});
	goToTop();
}

function minus(){
	zoomSet -= 0.05
	cy.viewport({zoom: zoomSet});
	goToTop();
}

function adaptiveShowInfo() {
	$('#cy, #scroll, #goToTop, #plus, #minus, #annotation').addClass('showInfoBlock');
	$('#info').removeClass('hideInfoBlock');
}

function showInfoMessage(text, timeMs) {
	if (!timeMs) timeMs = 3000;
	if (timerInfoMessage) clearTimeout(timerInfoMessage);

	$('#infoMessage').html(text).show(350);
	timerInfoMessage = setTimeout(function() {
		$('#infoMessage').hide(350).html('');
	}, timeMs);
}

function hideInfoMessage() {
	if (timerInfoMessage) clearTimeout(timerInfoMessage);
	$('#infoMessage').hide(350).html('');
}

function closeInfo() {
	$('#info').addClass('hideInfoBlock');
	$('#cy, #scroll, #goToTop, #plus, #minus, #annotation').removeClass('showInfoBlock');
}

//event

window.addEventListener('hashchange', function() {
	adaptiveShowInfo();
	$('#unit').html(location.hash.substr(1));
	$('#listInfo').show();
	focus = true;
	get_tx_info(location.hash.substr(1));
	if ($('#addressInfo').css('display') == 'block') {
		$('#addressInfo').hide();
	}
});

function get_tx_info(uint){
	// var url_query = "http://localhost:8000/transaction?hash="+uint;
	// var url_query = "http://10.253.169.129:8000/transaction?hash="+uint;
	var url_query = "http://latifrons.cf:8000/transaction?hash="+uint;
	$.get(url_query,function(data){
		var ParentsHash = data.ParentsHash.toString();
		ParentsHash = ParentsHash.replace(/,/g,'<br>');
		$('#From').html(data.From);
		$('#To').html(data.To);
		$('#Parents').html(ParentsHash);
		$('#Signature').html(data.Signature);
		$('#AccountNonce').html(data.AccountNonce);
		$('#Height').html(data.Height);
		$('#MineNonce').html(data.MineNonce);
		$('#Type').html(data.Type);
		$('#Value').html(data.Value);
	});
}

function initSocket(){
	ws.onopen = function(){  
		console.log('socket open');
		var startMsg = "{\"event\":\"new_unit\"}";
		ws.send(startMsg);
		read_confirmed_Tx();
	};
}

function reconnect (){
	ws = new WebSocket("ws://" + url);
	ws.onopen = function(){  
		console.log('socket open');
		var startMsg = "{\"event\":\"new_unit\"}";
		ws.send(startMsg);
		read_new_Tx();
		read_confirmed_Tx();
	};
	ws.onclose = disConnect;
	console.log(ws,'ws has reconnect');
}

var disConnect = function(){
	console.log('now ws is disconnected.');
    setTimeout(function(){
         reconnect();
    },500);
}

ws.onclose = disConnect;

function start(){
	createCy();
	read_new_Tx();
}

function edges_flash(){
	edges && edges.forEach(function(edge){
		// cy.getElementById(edge.id).flashClass('edge_flash',500);
	})
}

function pause(){
    console.log('in pause');
}

function read_new_Tx(){
	ws.onmessage = function(data){
		data = JSON.parse(data.data)
		if(data.type == "new_unit"){
			if(!IF_FIRST){
				generate(data);
				IF_FIRST = true;
				oldOffset = cy.getElementById(nodes[0].data.unit).position().y + 66;
				cy.viewport({zoom: zoomSet});
				cy.center(cy.nodes()[0]);
				page = 'dag';
			}else{
				var newTX = data;
				setNew(newTX,true);
				tip_index.push(newTX);
				rm_old_Tx(newTX.nodes.length);
				if(!focus) goToTop();  
			}
		}else if(data.type == "confirmed"){
			data.nodes.forEach(function(node){
				updateClass_comfirmed_unit(node.data.unit);
			})
		}
	}
}

function read_confirmed_Tx(){
	var startMsg2 = "{\"event\":\"confirmed\"}";
	ws.send(startMsg2);
}

function read_update_Tx(){
    socket.on('update', function(update) {
        update_Tx(update, 'txConfirmed');
    });
}

function update_Tx(update, updateType){
    var txHash = update.hash;
    var milestoneType = update.milestone;
    var confirmationTime = update.ctime;

    var hashIndex = tx_list.findIndex(tx => tx.hash === txHash);
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
}

function flash_tx_info(uint){
	adaptiveShowInfo();
	$('#unit').html(uint);
	$('#listInfo').show();
	get_tx_info(uint);
	if ($('#addressInfo').css('display') == 'block') {
		$('#addressInfo').hide();
	}
}

function read_random_tx(){
	var Data = {};
	Data.nodes = new_tip_index;
	draw_edges(Data);
	old_tip_index = new_tip_index;
	new_tip_index = [];
	if(!focus){
		goToTop();
	}
}

function rm_old_Tx(length){
	if(cy.nodes().length>200){
		var current_crood = cy.getElementById(last_uint)._private.position
		cy.nodes().forEach(function(node){
			var node_crood = node._private.position;
			if(node_crood.y>current_crood.y+1500){
				cy.remove(cy.getElementById(node._private.data.id));
			}
		})
	}	
}

function draw_edges(Data){
	var data = {};
			data.nodes = Data.nodes;
			data.edges = [];
	new_tip_index.forEach(function(res){
		var source = res.data.unit;
		for(var i=0;i<2;i++){
			var target = old_tip_index[Math.floor(Math.random() * old_tip_index.length)].data.unit;
			var id = gen_random_string(36);
			var dataA = {
				id :id,
				source : source,
				target : target
			}
			data.edges.push(dataA);
		}
	});
	setNew(data,true);
	old_tip_index.forEach(function(res){
		var unit = res.data.unit;
		updateClass_pending_unit(unit);
		pending_index.push(res);
	})
}

function gen_random_string(len){
	len = len || 32;
	var chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
	var maxPos = chars.length;
	var pwd = '';
	for (i = 0; i < len; i++) {
		pwd += chars.charAt(Math.floor(Math.random() * maxPos));
	}
	return pwd;
}

function gen_tip_unit(){
	var unit = gen_random_string(13)+'+HGeknnGW2LOsXgketPUK3dtawgdek=';
	var unit_s = unit.slice(0,7)+'...';
	var data = {
        unit : unit,
        unit_s : unit_s
	}
	var a = {
		data : data,
		type : ""
	}
	new_tip_index.push(a);
	tip_index.push(a);
}

function painting(){
	var random = randomNum(1,1)
	for(var i=0;i<random;i++){
		gen_tip_unit();
	}
	read_random_tx();
}