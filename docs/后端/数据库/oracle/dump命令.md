## 使用EXPDP导出数据

```shell
expdp username/password@SID directory=DUMP_DIR dumpfile=文件名.dmp logfile=文件名.log full=y
```

`FULL`表示导出整个数据库，默认N。

## 使用IMPDP工具导入数据

```
impdp username/password@SID directory=DUMP_DIR dumpfile=文件名.dmp logfile=文件名.log full=y
```

## 附：`expdp help=y`查看expdp的帮助信息

## 附：全库(整体数据库)备份迁移推荐使用rman