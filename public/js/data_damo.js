function data_damo(){
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
    console.log(data.edges);
}
data_damo();
/*
{ nodes:
    [ { data:{ unit: '/3WhIDCv2Ki2z+HGeknnGW2LOsXgketPUK3dtawgdek=',
        unit_s: '/3WhIDC...' },
        is_on_main_chain: 1,
        is_stable: 0,
        rowid: 4071777,
        sequence: 'good' },
      { data: { unit: '/8AAIDCv2Ki2z+HGeknnGW2LOsXgketPUK3dtawgdek=',
        unit_s: '/3AAIDC...' },
        is_on_main_chain: 1,
        is_stable: 0,
        rowid: 4071778,
        sequence: 'good' } ],
   edges: { data: { best_parent_unit: true, data:{ id: '99031584-2b04-42c8-82f3-efdc4a241ba8',
         source: '/3WhIDCv2Ki2z+HGeknnGW2LOsXgketPUK3dtawgdek=',
         target: '/8AAIDCv2Ki2z+HGeknnGW2LOsXgketPUK3dtawgdek=' } } }
*/