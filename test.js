var i18n =require('./i18n'),
    path=require('path');


var i18=new i18n({
  dic:path.join(__dirname,'i18n.json'),
  src:path.join(__dirname,'src'),
  type:['html','js']
})

//创建字典
i18.makeDit();