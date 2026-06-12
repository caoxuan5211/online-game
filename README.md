# Elastic Duo

双人联机小游戏原型：两个小人由弹力带连接，躲避四面八方飞来的障碍物，并在随机颜色区域闪烁时回到对应区域。碰到障碍、弹力带拉断、颜色区域失败都会结束游戏。

## 目录

```text
web/  # 完整 Web 版：Node.js 服务端 + 浏览器 Canvas 客户端
app/  # App 客户端：Vite + Capacitor，默认连接 http://160.25.134.111:3000
```

## Web 本地测试

```powershell
cd F:\game\web
npm install
npm run dev
```

打开两个浏览器窗口：

```text
http://localhost:3000
```

两个窗口输入同一个房间号，分别选择红色和蓝色，点击准备后开始。

## 当前体验特性

- 服务端 60Hz 权威 tick
- 客户端 60Hz 输入发送
- 80ms 快照插值，降低网络抖动
- 高 DPI Canvas，适配高刷新和高清屏
- 玩家速度拖尾、发光边缘、方向点
- 弹力带张力显示和高张力警示
- 障碍物发光轮廓和入场方向提示
- 颜色区域脉冲闪烁和倒计时环
- 移动端触控摇杆与安全区适配

## 部署到服务器

把 `web` 文件夹上传到服务器后执行：

```bash
cd web
npm install
PORT=3000 npm start
```

服务器需要放行 TCP `3000` 端口。没有域名时直接访问：

```text
http://160.25.134.111:3000
```

## App 本地测试

App 默认连接：

```text
http://160.25.134.111:3000
```

如果要连接本机 Web 服务测试：

```powershell
cd F:\game\app
npm install
$env:VITE_GAME_SERVER="http://localhost:3000"
npm run dev
```

## Android 打包

需要先安装 Android Studio 和 Android SDK。

```powershell
cd F:\game\app
npm run build
npm run cap:add:android
npm run cap:sync
npm run cap:open:android
```

`capacitor.config.json` 已开启 cleartext，所以当前可直接连接 HTTP IP。正式上架前建议换 HTTPS。
