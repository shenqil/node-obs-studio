# 根据不同环境对应版本的obs-studio-node

# 压缩命令
+ darwin-ram64
```
zip -r ../obs-studio-node-darwin-arm64.zip ./* -x "*/.DS_Store" "package.json"
```
+ darwin-x64
```
zip -r ../obs-studio-node-darwin-x64.zip ./* -x "*/.DS_Store" "package.json"
```
+ win32-x64
```
powershell -Command "Get-ChildItem -Path * -Recurse | Where-Object { $_.Name -ne 'package.json' } | Compress-Archive -DestinationPath ../obs-studio-node-win32-x64.zip -Force"
```

# 发布
```
npm publish
```