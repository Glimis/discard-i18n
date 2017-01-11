var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    firstLetter= require('./FirstLetter');
var zhReg=/[\u4e00-\u9fa5]+/g;    

    
var paths=[],//所有文件
    zhArrays=[],//所有中文
    py_zhs={},//拼音对应的中文
    zh_pys={};//中文对应的拼音

function main(src){
    //将需要扫描文件名,读取至paths中
    readdir(path.join(__dirname,src));
    _.each(paths,function(src){
        readFile(src);
    })

}

//获取所有中文后
var callback=_.after(paths.length, function(){
    //组合,去重
    var arrays=_.union.apply(this,zhArrays);
   // //获取第一种中文转拼音
   var zh_py=_.chain(arrays).mapKeys().mapValues(firstLetter).value();
    _.each(zh_py,function(vs,k){
        //获取不重复拼音
        var py=checkedKey(py_zhs,vs);
        py_zhs[py]={
            zh:k
        }
        zh_pys[k]=py;
    });
    //写入字典
    fs.writeFile('i18n.json',JSON.stringify(py_zhs,0,4));
    //修改中文
    _.each(paths,zh2seat)
})

/**
 * 修改中文为占位符
 */
function zh2seat (src){
    fs.readFile(src,'utf-8',function(e,data){
        var newhtml=data.replace(zhReg,function(val){
           return "{{"+zh_pys[val]+"}}";
        })
        fs.writeFile(src,newhtml);
    })
}


/**
 * 同步读取文件夹
 */
function readdir(src){
    var data=fs.readdirSync(src)
    _.each(data,function(filename){
        var _path=path.join(src,filename);
        if(fs.statSync(_path).isFile()){
            //文件,加入paths中
            paths.push(_path);
        }else{
            //文件夹
            readdir(_path);
        }
    })
}


/**
 * 读取文件
 */
function readFile(src){
    fs.readFile(src,'utf-8',function(e,data){
       //提取中文
       zhArrays.push(data.match(zhReg));
       callback();
    })
}

//获取不重复拼音
function checkedKey(py_zh,vs,num){
    //原生拼音
    if(_.isArray(vs)){
        var py= _.find(vs,function(v){
            return !py_zh[v];
        })   
        if(!py){
            return checkedKey(py_zh,vs[0],1)
        }else{
            return py;
        }
    }

    if(py_zh[vs+num]){
        return checkedKey(py_zh,vs[0],num+1)
    }else{
        return vs+num;
    }
 }