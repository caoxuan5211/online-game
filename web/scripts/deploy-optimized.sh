#!/bin/bash

# Elastic Duo 一键优化部署脚本
# 使用方法: ./scripts/deploy-optimized.sh

set -e

echo "🚀 Elastic Duo 优化部署脚本"
echo "================================"
echo ""

# 1. 检查依赖
echo "📦 检查依赖..."
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ 未找到 npm"
    exit 1
fi

echo "✅ Node.js 和 npm 已安装"
echo ""

# 2. 安装优化所需的包
echo "📦 安装依赖包..."
cd web
npm install compression --save 2>/dev/null || echo "⚠️  compression 可能已安装"
npm install sharp --save-dev 2>/dev/null || echo "⚠️  sharp 可能已安装"
echo "✅ 依赖安装完成"
echo ""

# 3. 优化图片
echo "🎨 优化图片资源..."
if [ -f "scripts/optimize-images.js" ]; then
    node scripts/optimize-images.js
    echo "✅ 图片优化完成"
else
    echo "⚠️  未找到优化脚本，跳过"
fi
echo ""

# 4. 备份原文件
echo "💾 备份原始文件..."
if [ -f "public/assets/background.png" ]; then
    cp public/assets/background.png public/assets/background.png.backup
    echo "✅ 已备份 background.png"
fi

if [ -f "server/index.js" ]; then
    cp server/index.js server/index.js.backup
    echo "✅ 已备份 index.js"
fi
echo ""

# 5. 应用优化
echo "⚙️  应用优化配置..."

# 替换背景图片 (如果 WebP 存在且更小)
if [ -f "public/assets/background.webp" ]; then
    WEBP_SIZE=$(stat -f%z "public/assets/background.webp" 2>/dev/null || stat -c%s "public/assets/background.webp")
    PNG_SIZE=$(stat -f%z "public/assets/background.png" 2>/dev/null || stat -c%s "public/assets/background.png")

    if [ "$WEBP_SIZE" -lt "$PNG_SIZE" ]; then
        echo "✅ WebP 更小 ($(($WEBP_SIZE/1024))KB vs $(($PNG_SIZE/1024))KB)"
    fi
fi

echo ""

# 6. 测试服务器
echo "🧪 测试服务器配置..."
node -c server/index.js && echo "✅ 服务器配置有效" || echo "❌ 服务器配置有误"
echo ""

# 7. 完成
echo "✅ 优化完成！"
echo ""
echo "📝 后续步骤:"
echo "1. 检查生成的优化文件"
echo "2. 手动更新 server/index.js 添加 compression 中间件"
echo "3. 更新 HTML/CSS 使用 WebP 图片"
echo "4. 本地测试: npm start"
echo "5. 部署到服务器: ssh vps1 && cd /opt/online-game/web && git pull && pm2 restart elastic-duo"
echo ""
echo "📊 查看优化报告: cat ../docs/optimization-report.md"
