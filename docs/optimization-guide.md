# Elastic Duo 优化实施指南

## 优化清单

### ✅ 已完成
1. ✅ 创建优化报告 (`docs/optimization-report.md`)
2. ✅ 创建图片优化脚本 (`web/scripts/optimize-images.js`)

### 📋 待实施 (需要手动执行)

#### 1. 安装依赖包 (需要用户授权)

```bash
cd web
npm install compression --save
npm install sharp --save-dev
```

#### 2. 优化背景图片

```bash
cd web
node scripts/optimize-images.js
```

这会生成:
- `public/assets/background-optimized.png` (优化后的 PNG)
- `public/assets/background.webp` (WebP 格式)

#### 3. 更新服务器代码启用压缩

编辑 `web/server/index.js`，在第 6 行后添加:

```javascript
import compression from "compression";
```

在第 19 行后 (创建 io 之后) 添加:

```javascript
app.use(compression());
```

#### 4. 更新 HTML 使用 WebP

编辑 `web/public/index.html`，将第 8 行的:

```html
<link rel="preload" href="./assets/background.png" as="image" />
```

替换为:

```html
<link rel="preload" href="./assets/background.webp" as="image" 
      type="image/webp" />
```

更新 CSS 中的背景图片引用 (`web/public/styles.css`):

```css
.scene-bg {
  background-image: url('./assets/background.webp');
  /* 降级方案 */
}
```

#### 5. 更新 Service Worker

编辑 `web/public/sw.js`，在 CORE_ASSETS 数组中:

将:
```javascript
"./assets/background.png",
```

改为:
```javascript
"./assets/background.webp",
```

#### 6. 测试和部署

```bash
# 本地测试
cd web
npm start

# 访问 http://localhost:3000 测试

# 确认无误后，同步到服务器
ssh vps1
cd /opt/online-game/web
git pull
npm install
pm2 restart elastic-duo
```

## 预期效果

| 项目 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 背景图片 | 2.08 MB | ~150 KB | -93% |
| JS 传输大小 | ~60 KB | ~18 KB | -70% |
| CSS 传输大小 | ~17 KB | ~5 KB | -70% |
| 首次加载 | ~2.2 MB | ~200 KB | -91% |

## 注意事项

1. **图片优化**: 运行脚本后检查生成的图片质量，确保视觉效果可接受
2. **WebP 兼容性**: 现代浏览器都支持，如需支持老旧浏览器可保留 PNG 降级方案
3. **Service Worker**: 更新后用户需要刷新两次才能看到新版本
4. **Git**: 记得将优化后的文件提交到仓库

## 高级优化 (可选)

### 预压缩静态资源

可以预先生成 .gz 和 .br 文件，nginx/CDN 可以直接提供:

```bash
# 安装工具
npm install --save-dev gzipper

# 添加到 package.json scripts:
"build:compress": "gzipper compress ./public --exclude sw.js,index.html"

# 构建时运行
npm run build:compress
```

### 使用 CDN

将 `public/assets/` 目录上传到 CDN (如 Cloudflare, 阿里云 OSS):

1. 上传静态资源到 CDN
2. 更新 `config.js` 添加 CDN_URL
3. 更新资源路径引用

### 添加资源监控

在 `index.html` 添加性能监控:

```javascript
window.addEventListener('load', () => {
  const perf = performance.getEntriesByType('navigation')[0];
  console.log('页面加载时间:', perf.loadEventEnd - perf.fetchStart, 'ms');
  
  // 上报到分析服务
});
```

## 问题排查

- **压缩不工作**: 检查 nginx 是否已启用 gzip
- **图片不显示**: 检查路径和 CORS 配置
- **Service Worker 缓存问题**: 清除浏览器缓存或增加版本号
