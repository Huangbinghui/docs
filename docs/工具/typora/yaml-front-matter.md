[toc]



# typora-root-url

```yaml
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
```

例如, 在YAML Front Matters输入 `typora-root-url:/User/Abner/Website/typora.io/` , 然后在Typora中 `![alt](/blog/img/test.png)` 图片引用会被自动处理成 `![alt](file:///User/Abner/Website/typora.io/blog/img/test.png)` .

在新的版本, 你可以点击菜单栏 `格式` → `图像` → `设置图片根目录` 来让 Typora 自动生成 `typora-root-url` 属性，而不是手动配置 `typora-root-url` 。

# typora-copy-images-to

```
typora-copy-images-to: ../../images
```

YAML Front Matter中`typora-copy-images-to: {relative path}` 将会把图片默认复制到这个相对路径. 所以你要手动设置这个属性