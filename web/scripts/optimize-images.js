#!/usr/bin/env node

/**
 * Image optimization script for Elastic Duo
 * Compresses PNG images and optionally converts to WebP
 *
 * Usage:
 *   node scripts/optimize-images.js
 *
 * Requirements:
 *   npm install sharp --save-dev
 */

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';

const IMAGE_DIR = join(process.cwd(), 'public', 'assets');
const QUALITY = {
  png: { quality: 85, compressionLevel: 9 },
  webp: { quality: 82 }
};

async function findImages(dir) {
  const files = [];
  const entries = await readdir(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      files.push(...await findImages(fullPath));
    } else if (/\.(png|jpg|jpeg)$/i.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function optimizeImage(filePath) {
  const ext = extname(filePath).toLowerCase();
  const name = basename(filePath, ext);
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));

  const originalStats = await stat(filePath);
  const originalSize = originalStats.size;

  console.log(`\n📸 处理: ${basename(filePath)}`);
  console.log(`   原始大小: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    console.log(`   尺寸: ${metadata.width}x${metadata.height}`);

    // Optimize PNG
    if (ext === '.png') {
      const optimizedPath = join(dir, `${name}-optimized.png`);
      await image
        .png(QUALITY.png)
        .toFile(optimizedPath);

      const optimizedStats = await stat(optimizedPath);
      const optimizedSize = optimizedStats.size;
      const savingsPct = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

      console.log(`   ✅ PNG优化: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB (节省 ${savingsPct}%)`);
    }

    // Convert to WebP
    const webpPath = join(dir, `${name}.webp`);
    await image
      .webp(QUALITY.webp)
      .toFile(webpPath);

    const webpStats = await stat(webpPath);
    const webpSize = webpStats.size;
    const webpSavingsPct = ((1 - webpSize / originalSize) * 100).toFixed(1);

    console.log(`   ✅ WebP转换: ${(webpSize / 1024 / 1024).toFixed(2)} MB (节省 ${webpSavingsPct}%)`);

    return {
      original: filePath,
      originalSize,
      webpSize,
      savings: originalSize - webpSize
    };

  } catch (error) {
    console.error(`   ❌ 错误: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🎨 Elastic Duo 图片优化工具\n');
  console.log(`📁 扫描目录: ${IMAGE_DIR}\n`);

  const images = await findImages(IMAGE_DIR);
  console.log(`找到 ${images.length} 个图片文件\n`);

  let totalSavings = 0;
  const results = [];

  for (const image of images) {
    const result = await optimizeImage(image);
    if (result) {
      results.push(result);
      totalSavings += result.savings;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 优化总结\n');
  console.log(`处理图片: ${results.length} 个`);
  console.log(`总节省: ${(totalSavings / 1024 / 1024).toFixed(2)} MB`);
  console.log('\n💡 提示:');
  console.log('1. 查看生成的 *-optimized.png 和 *.webp 文件');
  console.log('2. 测试后，手动替换原文件');
  console.log('3. 更新 HTML 使用 <picture> 标签支持 WebP');
}

main().catch(console.error);
