'use strict'
var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    firstLetter= require('firstletter');
var zhReg=/[\u4e00-\u9fa5]+/g;    
var fetch =require('node-fetch')
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


/**
 * 读取文件
 */
function readFile(src,c){

    fs.readFile(src,'utf-8',function(e,data){
       //提取中文
       zhArrays.push(data.match(zhReg));
       c();
    })
}

//获取不重复拼音
function getPy(py_zh,vs,num){
    //原生拼音
    if(_.isArray(vs)){
        var py= _.find(vs,function(v){
            return !py_zh[v];
        })   
        if(!py){
            return getPy(py_zh,vs[0],1)
        }else{
            return py;
        }
    }

    if(py_zh[vs+num]){
        return getPy(py_zh,vs[0],num+1)
    }else{
        return vs+num;
    }
 }



function  scanWord(src,zhArrays,cb){
    fs.readFile(src,'utf-8',function(e,data){
       //提取中文
       zhArrays.push(data.match(zhReg));
       cb();
    })
}

//通过src,字典,创建i18文件
function createI18nfile(src,zh_pys,py_zhs,locale){
    fs.readFile(src,'utf-8',function(e,text){
        _.each(locale,function(local){
            var newtext=text.replace(zhReg,function(val){
                //如果不存在,使用原来的数据
                if(val=="添加外部专家"){
                    console.log(zh_pys[val],py_zhs[zh_pys[val]],local,py_zhs[zh_pys[val]][local])
                }
               return py_zhs[zh_pys[val]][local]||val;
            })
            //拼写新的地址
            var ps=src.split('.');
            ps[ps.length]=ps[ps.length-1];
            ps[ps.length-2]=local;
            //写入
            fs.writeFile(ps.join('.'),newtext)
        })

    })
}

class i18n {
    //创建字典，flag->true,写入config.dic中
    static makeDic(flag){
        return new Promise(function(resolve, reject) {
            var paths=[],//所有文件
                zhArrays=[],//所有中文
                py_zhs={},//拼音对应的中文
                zh_pys={};//中文对应的拼音   
            //同步获取需要扫描的文件    
            readdir(i18n.config.src, paths);
            console.log('扫描文件'+paths.length+"个");           
            var cb=_.after(paths.length,function(){
                     var arrays=_.union.apply(this,zhArrays);
                     console.log('获取中文单词'+arrays.length+"个")
                     //获取第一种中文转拼音
                     var zh_py=_.chain(arrays).mapKeys().mapValues(firstLetter).value();
                     _.each(zh_py,function(vs,k){
                                //获取不重复拼音
                                var py=getPy(py_zhs,vs);
                                py_zhs[py]={
                                    zh:k
                                }
                                zh_pys[k]=py;
                            });
                     if(flag){
                        i18n.writeDic(py_zhs)
                            .then(function(py_zhs){
                                 resolve({
                                        zh_pys:zh_pys,
                                        py_zhs:py_zhs,
                                        paths:paths
                                     });
                            })
                     }else{
                         resolve({
                            zh_pys:zh_pys,
                            py_zhs:py_zhs,
                            paths:paths
                         });
                     }
                });
            _.each(paths,function(src){
                scanWord(src,zhArrays,cb);
            })
        });
    }
    //数据合并字典
    static writeDic(data){
        return new Promise(function(resolve, reject) {
            var src=i18n.config.dic;
            fs.readFile(src,'utf-8',function(e,olddata){
                var olddata=JSON.parse(olddata);
                var num=0;
                var newdata=_.mapValues(data,function(v,k){
                    var d=_.extend(_.get(olddata,k),v);
                    !d.en||num++;
                    return d;
                })


               //自动生成翻译
                 if(i18n.config.translate){
                    var cb=_.after(num,function(){
                        fs.writeFile(src,JSON.stringify(newdata,0,4));
                        resolve(newdata);
                    })
                    _.each(newdata,function(v,k){
                        if(!v.en){
                         fetch('http://fanyi.youdao.com/openapi.do?keyfrom=glimis123123&key=243950541&type=data&doctype=json&version=1.1&q='+v.zh)
                            .then(function(res){
                                return res.json();
                            })
                            .then(function(data){ 
                                newdata[v].en=data.translation
                                cb();
                            }) 
                            .catch(function(){
                                cb();
                            })
                        }
                    })
                       

                 }else{
                    fs.writeFile(src,JSON.stringify(newdata,0,4));
                    resolve(newdata);
                }
                
            })
        })
    }
    //生成文件
    static exec(){
        //初始化数据
        if(!i18n.config.type){
            i18n.config.type=['html','js','ejs'];
        }
        // 生成字典
        i18n.makeDic(true)
            .then(function(obj){
                var py_zhs=obj.py_zhs,zh_pys=obj.zh_pys,paths=obj.paths;
                _.each(paths,_.partial(createI18nfile,_,zh_pys,py_zhs,i18n.config.locale));
            })

    }
}

i18n.config={
        type:['html','js','ejs'],
        src:"src",
        dic:"i18n.json"
    }

module.exports = i18n;

