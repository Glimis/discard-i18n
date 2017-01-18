## 国际化--获取中文
提取项目中的所有中文

## 使用
```javascript
var i18=new i18n({
  //字典地址
  dic:path.join(__dirname,'i18n.json'),
  //扫描地址
  src:path.join(__dirname,'src'),
  //文件类型
  type:['html','js']
})

//创建字典
i18.makeDit();
```