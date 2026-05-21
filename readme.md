# 根据不同环境对应版本的obs-studio-node

# 压缩命令
+ darwin-ram64
```
tar -czvf ../obs-studio-node-darwin-arm64.tar.gz ./*
```
+ darwin-x64
```
tar -czvf ../obs-studio-node-darwin-x64.tar.gz ./*
```
+ win32-x64
```
zip -ry ../obs-studio-node-win32-x64.zip . -x "./package.json"
```
+ 使用Linux子系统

# 发布
```
npm publish
```