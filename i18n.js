'use strict'
var fs = require('fs'),
    path = require('path'),
    _ = require('lodash');
    //必须中文开头,可以包含数字,字母,符号,以及中文
var zhReg=/[\u4e00-\u9fa5]+[\u4e00-\u9fa5_a-zA-Z0-9_。？！、，]*/g;    




/**
 * 同步读取文件夹
 */
function readdir(src,type){
    var paths=[];
    var data=fs.readdirSync(src);
    _.each(data,function(filename){
        var _path=path.join(src,filename);
        if(fs.statSync(_path).isFile()){
            if(i18n.checkedFile(_path,type)){
                //文件,加入paths中
                paths.push(_path);
            }
        }else{
            //文件夹
            readdir(_path,paths);
        }
    })
    return paths;
}


const config={
    src:'',//扫描文件地址
    dic:'',//字典地址
    type:['html','js'],
    locale:['en'],
    translate:false
}


class i18n {
    constructor(cfg) {
        _.extend(this,config,cfg)
    }
    //获取需要翻译文件
    scanFile(){
        var self=this;
        var src=this.src,
            type=this.type;
        return new Promise(function(resolve, reject) {
            if(!src){
                resolve({})  
            }else{
                //获取所有地址
                var paths=readdir(src,type);
                //地址->文本 文本在3-10M之间,不会太占用内存
                var rs={};
                var callback=_.after(paths.length,function(){
                   
                    resolve(rs);
                })
                _.each(paths,function(path){
                    fs.readFile(path,'utf-8',function(e,data){
                        if(e){
                            data="";
                        }
                        rs[path]=data;
                        callback();
                    })
                })
                
            }
        });
    }   
    //创建字典
    makeDit(fn){
        if(!fn){
            //通过新老数据,进行整合
            fn=function(nval,oval){
                var dt=_.extend({},oval,nval);
                //参考老字典
                _.each(oval,function(v,k){
                    dt[k]=dt[k]||v;
                })
                return dt;
            }
        }
        var self=this;
        return new Promise(function(resolve, reject) {
        self.scanFile()
            .then(function(data){
                var texts=_.values(data);
                var words=i18n.match(texts)
                words=_.union.apply(this,words);
                //翻译
                var data=_.chain(words).mapKeys().mapValues(function(){return ''}).value();
                //读取老字典数据
                fs.readFile(self.dic,'utf-8',function(e,olddatatext){
                    var rs,olddata={};
                    if(!e){
                        try{
                            olddata=JSON.parse(olddatatext);
                        }catch(e){
                            olddata={};
                        }
                    }
                    rs=fn(data,olddata)
                    fs.writeFile(self.dic,JSON.stringify(rs,0,4),function(e,data){
                        if(e){
                            reject(e);
                        }else{
                            resolve(data)
                        }
                    })
                })

            })
        })
    }  

    /**
     * 判断文件名是否符合
     * 1.xxx.en.html 不需要扫描
     * 2.xxx.css 不需要扫描
     */
    static checkedFile(src,type){
        var as=src.split('.');
        if(as.length>2){
            return false;
        }
        return _.indexOf(type,_.last(as))>-1;
    }


    static match(text){
        if(_.isArray(text)){
            var rs=[];
            _.each(text,function(t){
                rs.push(i18n.match(t));
            })
            return rs;
        }else if(_.isString(text)){
            //去掉js下的注释
            text=text.replace(/\/\/(.+?)*/g,function(){
                return '';
            })
            /**
             * 去掉js下的注释
             */
            text=text.replace(/\/\*[\d\D]*\*\//g,function(){
                return '';
            })
            
            return text.match(zhReg);
        }
    }

    //获取文本中文
    static matchChinese(path){
        return new Promise(function(resolve, reject) {
            fs.readFile(path,'utf-8',function(e,data){
                if(e){
                    //不是文件,将地址转为字符串
                    data=path;
                }
                resolve(i18n.match(data));
            })
        });
    }


}

module.exports = i18n;

