
var mysql=require("mysql");
var Promise = require("bluebird");

function MysqlDB(connObj){
  this._connObj = connObj
  this._pool = mysql.createPool(connObj);
}

/**
 * 生成一个查询准备,与executeBatch配合使用
 * @param  {[type]} sql    [description]
 * @param  {[type]} values [description]
 * @return {[type]}        [description]
 */
MysqlDB.prototype.prepare = function(sql,values){
  return {"sql":sql,"values":values instanceof Array ? values:values?[values]:[]};
}

/**
 * 批量执行 prepare数组
 * @param  {[type]} prepares [description]
 * @return {[type]}          [description]
 */
MysqlDB.prototype.executeBatch = function(prepares){
  var self = this;
  return new Promise(function(accept, reject) {
    self._pool.getConnection(function(err,conn){
      if(err){
        reject(err);
      }else{
        conn.beginTransaction(function(err2){
          if(err2){
            conn.release();
            reject(err2);
          }else{
            Promise.mapSeries(prepares,function(item){
              return new Promise(function(acceptItem,rejectItem){
                conn.query(item.sql,item.values,function(err,result){
                  if(err){
                    rejectItem(err);
                  }else{
                    acceptItem(result);
                  }
                })    
              })
            },0).then(function(results){
              conn.commit(function(err){
                conn.release();
                if(err){
                  reject(err)
                }else{
                  accept(results);
                }
              })
            }).catch(function(err){
              conn.release();
              //console.error("MysqlDB:executeBatch error , rollback :",err.message)
              conn.rollback(function(){
                reject(err)
              });
            });
          }
        });
        
      }
    });
  });
}

MysqlDB.prototype.getConnection = function(){
  var self = this;
  return new Promise(function(accept, reject) {
    self._pool.getConnection(function(err,conn){
      if(err){
        reject(err);
      }else{
        accept(conn)
      }
    });
  })
}

MysqlDB.prototype.beginTransaction = function(conn){
  return new Promise(function(accept, reject) {
    conn.beginTransaction(function(err){
      if(err){
        reject(err);
      }else{
        accept(conn)
      }
    });
  })
}

MysqlDB.prototype.rollback = function(conn){
  return new Promise(function(accept, reject) {
    conn.rollback(function(err){
      if(err){
        reject(err);
      }else{
        accept(conn)
      }
    });
  })
}

MysqlDB.prototype.commit = function(conn){
  return new Promise(function(accept, reject) {
    conn.commit(function(err){
      if(err){
        reject(err);
      }else{
        accept(conn)
      }
    });
  })
}

MysqlDB.prototype.exec = function(){
  var args = Array.prototype.slice.call(arguments).filter(function (a) {return a !== undefined; }); 
  var conn = args[0]
  args = args.slice(1)
  return new Promise(function(accept, reject) {
    args.push(function(err,result){
      if(err){
        reject(err);
      }else{
        accept(result);
      }
    })
    conn.query.apply(conn,args);
  })
}

MysqlDB.prototype.release = function(conn){
  conn.release()
}


/**
 * [execute description]
 * @return {[type]} [description]
 */
MysqlDB.prototype.execute = function(){
  var self = this;
  if(!self._pool){
    throw new Error("MysqlDB was not initialized")
  }
  var args = Array.prototype.slice.call(arguments).filter(function (a) {return a !== undefined; });
  return new Promise(function(accept, reject) {
    self._pool.getConnection(function(err,conn){
      if(err){
        reject(err);
      }else{
        args.push(function(qerr,result){
          conn.release();//释放连接
          if(qerr){
            reject(qerr)
          }else{
            accept(result)   //result.insertId
          }
        })
        conn.query.apply(conn,args);
      }
    });
  })
}


/**
 * [query description]
 * @return {[type]} [description]
 */
MysqlDB.prototype.query = function(){
  var self = this;
  if(!self._pool){
    throw new Error("MysqlDB was not initialized")
  }
  var args = Array.prototype.slice.call(arguments).filter(function (a) {return a !== undefined; });
  return new Promise(function(accept, reject) {
    self._pool.getConnection(function(err,conn){
      if(err){
        reject(err);
      }else{
        args.push(function(qerr,rows){
          conn.release();//释放连接
          if(qerr){
            reject(qerr)
          }else{
            accept(JSON.parse(JSON.stringify(rows)));
          }
        })
        conn.query.apply(conn,args);
      }
    });

  })
}


module.exports= MysqlDB