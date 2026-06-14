#!/usr/bin/env node

/**
 * 测试服务器压缩效果
 * 使用方法: node scripts/test-compression.js
 */

import { readFile } from 'fs/promises';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { join } from 'path';

const gzipAsync = promisify(gzip);

async function testCompression(filePath, label) {
  try {
    const content = await readFile(filePath);
    const compressed = await gzipAsync(content);

    const originalSize = content.length;
    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`${label}:`);
    console.log(`  原始大小: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`  压缩后: ${(compressedSize / 1024).toFixed(2)} KB`);
    console.log(`  压缩率: ${ratio}%`);
    console.log('');

    return { originalSize, compressedSize, ratio };
  } catch (error) {
    console.error(`❌ 无法读取 ${filePath}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🧪 Elastic Duo 压缩效果测试\n');
  console.log('测试 Gzip 压缩对各类文件的效果:\n');

  const files = [
    { path: 'public/index.html', label: 'HTML (index.html)' },
    { path: 'public/styles.css', label: 'CSS (styles.css)' },
    { path: 'public/src/main.js', label: 'JavaScript (main.js)' },
    { path: 'public/src/render.js', label: 'JavaScript (render.js)' },
    { path: 'public/src/ui.js', label: 'JavaScript (ui.js)' },
  ];

  let totalOriginal = 0;
  let totalCompressed = 0;

  for (const file of files) {
    const result = await testCompression(file.path, file.label);
    if (result) {
      totalOriginal += result.originalSize;
      totalCompressed += result.compressedSize;
    }
  }

  console.log('='.repeat(50));
  console.log('📊 总计:');
  console.log(`  原始总大小: ${(totalOriginal / 1024).toFixed(2)} KB`);
  console.log(`  压缩后总大小: ${(totalCompressed / 1024).toFixed(2)} KB`);
  console.log(`  总体压缩率: ${((1 - totalCompressed / totalOriginal) * 100).toFixed(1)}%`);
  console.log(`  节省流量: ${((totalOriginal - totalCompressed) / 1024).toFixed(2)} KB`);
  console.log('');
  console.log('💡 提示:');
  console.log('  添加 compression 中间件可以自动实现这个压缩效果！');
  console.log('  在 server/index.js 中添加:');
  console.log('    import compression from "compression";');
  console.log('    app.use(compression());');
}

main().catch(console.error);
