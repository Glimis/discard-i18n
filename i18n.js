'use strict'
var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    firstLetter= require('firstletter');
var zhReg=/[\u4e00-\u9fa5]+/g;    
var fetch =require('node-fetch');

const config={
    src:'',//扫描文件地址
    dic:'',//字典地址
    type:['html','js'],
    locale:['en'],
    translate:false
}


/**
 * 同步读取文件夹
 */
function readdir(src,paths){
    var data=fs.readdirSync(src)
    _.each(data,function(filename){
        var _path=path.join(src,filename);
        if(fs.statSync(_path).isFile()){
            var as=_path.split('.');
            //xxx.en.html,略
            if(as.length>2){
                return;
            }
            //存在类型中
            if(_.indexOf(i18n.config.type,_.last(as))>-1){
                //文件,加入paths中
                paths.push(_path);
            }
            //
        }else{
            //文件夹
            readdir(_path,paths);
        }
    })
}



class i18n {
    //获取需要扫描的文件夹
    //同步获取,不包含失败
    static scanFile(src){
        return new Promise(function(resolve, reject) {
            var paths=[];
            readdir(src,paths);
            console.log('获取文件'+paths.length+"个");
            resolve(paths);
        });
    }
    //通过文件名扫描中文单词
    static scanWordByFile(filePath){
        return new Promise(function(resolve, reject) {
            fs.readFile(filePath,'utf-8',function(e,data){
                if(e){
                    reject(e);
                }else{
                    resolve(data.match(zhReg));
               }
            })
        });
    }
    //批量扫描,获取中文单词
    //不包含失败,返回[]
    static scanWordByFiles(filePaths){
        return new Promise(function(resolve, reject) {
            var arrays=[];
            //扫描完成后,合并并返回
            var callback=_.after(filePaths.length,function(){
                var allWords=_.union.apply(this,arrays);
                resolve(allWords);
            })
            _.each(filePaths,function(filePath){
                i18n.scanWordByFile(filePath)
                    .then(function(data){
                        arrays.push(data);
                        callback();
                    })
                    .catch(callback)
            })
        });
    }
    //中文转英文/字典
    //不包含失败,返回{}
    static word2dit(words){
        return new Promise(function(resolve, reject) {
            var data=_.chain(words).mapKeys().mapValues(function(){return ''}).value()
            //翻译
            resolve(data);
        });
    }
    //字典数据+字典地址数据合并
    //中文为关键字,以最新Value为准
    static unionDit(ndit,src){
        return new Promise(function(resolve, reject) {
            i18n.readDit(src)
                .then(function(odit){
                    //此处包含新字典与老字典重复,且新字典没有翻译
                    var dt=_.extend({},odit,ndit);
                    //参考老字典
                    _.each(odit,function(v,k){
                        dt[k]=dt[k]||v;
                    })
                    resolve(dt);
                })
        });
    }

    //读取字典文件
    static readDit(src){
        return new Promise(function(resolve, reject) {
            fs.readFile(src,'utf-8',function(e,data){
                if(e){
                    resolve({});  
                }else{
                    var d={};
                    try{
                        d=JSON.parse(data);    
                    }catch(e){

                    }
                    resolve(d);
                }
            })
        });
    }
    //写入字典
    static writeDit(dit,src){
        return new Promise(function(resolve, reject) {
            fs.writeFile(src,JSON.stringify(dit,0,4),function(e,data){
                if(e){
                    console.log(e);
                    reject(e);
                }else{
                    resolve(dit)
                }
            })
        }); 
    }
    //批量转换文件
    static createLocalFilesByDit(filePaths,dit,getFilePath){

        if(_.isString(dit)){
            return  new Promise(function(resolve, reject) {
                     i18n.readDit(dit)
                        .then(function(data){
                            i18n.createLocalFilesByDit(filePaths,data,getFilePath)
                                .then(function(data){
                                    resolve(data);
                                })
                        })
                    })

        }else{
            return new Promise(function(resolve, reject) {
                var arrays=[];
                var callback=_.after(filePaths.length,function(){
                    var data=_.union.apply(this,arrays);
                    console.log('包含'+data.length+"条中文,并未进行翻译");
                    resolve(_.union.apply(this,arrays));
                })

                _.each(filePaths,function(filePath){
                    i18n.createLocalFileByDit(filePath,dit,getFilePath)
                        .then(function(data){
                            arrays.push(data);
                            callback();
                        })
                        
                })
            }); 
        }

    }
    //根据字典信息,翻译文件
    static createLocalFileByDit(filePath,dit,getFilePath){
            return new Promise(function(resolve, reject) {
                var array=[];
                fs.readFile(filePath,'utf-8',function(e,data){
                        if(e){
                            resolve([]);
                        }else{
                           var text=data.replace(zhReg,function(v){
                                //转换为英文,如果没有,依然使用中文
                                if(dit[v]){
                                    return dit[v];
                                }else{
                                    array.push(v);
                                    return v;    
                                }
                           })
                           var _ps="";
                            if(getFilePath){
                                _ps= getFilePath(filePath);
                            }else{
                            var ps= filePath.split('.') ;
                                ps[ps.length]=ps[ps.length-1];
                                ps[ps.length-2]="en";
                                _ps=ps.join('.');
                            }
                            
                            fs.writeFile(_ps,text)
                            resolve(array);
                       }
                    })
            }); 
    }

    static getConfig(key){
        return _.extend({},config,i18n.config)[key];
    }
    //创建字典
    static makeDit(){
        var config=_.extend({},config,i18n.config),
            dist=config.dist,
            dic=config.dic;
        i18n.scanFile(dist)
          //获取中文单词
          .then(i18n.scanWordByFiles)
          //翻译
          .then(i18n.word2dit)
          //合并
          .then(_.partial(i18n.unionDit,_,dic))
          //注入
          .then(_.partial(i18n.writeDit,_,dic))
          .then(function(data){
              console.log("写入字典完成")
          })
          .catch(function(e){
            console.log(e)
          })
    }
    //生成多文件
    static exec(){
        var config=_.extend({},config,i18n.config),
            dist=config.dist,
            dic=config.dic;
         i18n.scanFile(dist)
              .then(_.partial(i18n.createLocalFilesByDit,_,dic))
              .then(function(data){

              })
    }
    //好危险的样子
    static change(){
        var config=_.extend({},config,i18n.config),
            src=config.src,
            dic=config.dic;

             i18n.scanFile(src)
                  .then(_.partial(i18n.createLocalFilesByDit,_,dic,function(v){
                    return v
                  }))
                  .then(function(data){
                     console.log('使用git checkout . 进行还原')
                  })
       
    }

}



module.exports = i18n;

