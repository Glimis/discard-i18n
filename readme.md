## 使用
```
'use strict'
var path=require('path');
var i18n =require('i18n');

i18n.config={
    //扫描文件地址
    src:path.join(__dirname,'dist'),
    //字典地址
    dic:path.join(__dirname,'locale/i18n.json'),
    type:['html','js'],
    locale:['en'],
    translate:false//使用网络翻译
}
// //完善字典
// i18n.makeDic(false).then(function(obj){
//     var py_zhs=obj.py_zhs,zh_pys=obj.zh_pys;
//     console.log('拼音',py_zhs);
//     console.log('中文',zh_pys);
// });

//产生文件
i18n.exec()
```

### 运行内容
* 1.获取src文件夹下,type后缀,且不包含locale的所有文件
* 2.扫描文件内容,并获取所有中文(/[\u4e00-\u9fa5]+/g)单词
* 3.获取字典内容,并进行合并
* 4.无翻译的内容,进行api翻译

### 字典
```javascript


```