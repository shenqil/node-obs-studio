# 根据不同环境对应版本的obs-studio-node

# 压缩命令
+ darwin-ram64
```
zip -ry ../obs-studio-node-darwin-arm64.zip . -x "*/.DS_Store" "./package.json"
```
+ darwin-x64
```
zip -ry ../obs-studio-node-darwin-x64.zip . -x "*/.DS_Store" "./package.json"
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