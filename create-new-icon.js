const fs = require('fs');
const { createCanvas } = require('canvas');

// 颜色配置
const colors = {
  gradientStart: '#4F46E5',  // 深紫蓝
  gradientEnd: '#06B6D4',    // 青蓝色
  cupOutline: '#FFFFFF',     // 白色
  documentIcon: '#E0F2FE',   // 浅蓝色
  arrow: '#FFFFFF',          // 白色
  steam: 'rgba(255,255,255,0.6)' // 半透明白色
};

function createIcon(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 清除画布
  ctx.clearRect(0, 0, size, size);
  
  const scale = size / 128; // 缩放比例
  
  // 1. 绘制渐变背景圆形
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 60 * scale;
  
  const gradient = ctx.createLinearGradient(
    centerX - radius, centerY - radius,
    centerX + radius, centerY + radius
  );
  gradient.addColorStop(0, colors.gradientStart);
  gradient.addColorStop(1, colors.gradientEnd);
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  // 2. 绘制咖啡杯主体轮廓
  const cupX = centerX - 5 * scale;
  const cupY = centerY - 10 * scale;
  const cupWidth = 35 * scale;
  const cupHeight = 40 * scale;
  
  ctx.strokeStyle = colors.cupOutline;
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 杯子主体
  ctx.beginPath();
  ctx.moveTo(cupX - cupWidth/2, cupY - cupHeight/2);
  ctx.lineTo(cupX - cupWidth/2, cupY + cupHeight/2 - 8 * scale);
  ctx.quadraticCurveTo(cupX - cupWidth/2, cupY + cupHeight/2, cupX - cupWidth/2 + 8 * scale, cupY + cupHeight/2);
  ctx.lineTo(cupX + cupWidth/2 - 8 * scale, cupY + cupHeight/2);
  ctx.quadraticCurveTo(cupX + cupWidth/2, cupY + cupHeight/2, cupX + cupWidth/2, cupY + cupHeight/2 - 8 * scale);
  ctx.lineTo(cupX + cupWidth/2, cupY - cupHeight/2);
  ctx.stroke();
  
  // 3. 添加咖啡杯手柄
  const handleX = cupX + cupWidth/2 + 5 * scale;
  const handleY = cupY;
  const handleSize = 12 * scale;
  
  ctx.beginPath();
  ctx.arc(handleX, handleY, handleSize/2, -Math.PI/2, Math.PI/2, false);
  ctx.stroke();
  
  // 4. 在杯子内部左侧绘制文档图标
  const docX = cupX - 10 * scale;
  const docY = cupY;
  const docWidth = 10 * scale;
  const docHeight = 12 * scale;
  
  ctx.fillStyle = colors.documentIcon;
  ctx.beginPath();
  ctx.rect(docX - docWidth/2, docY - docHeight/2, docWidth, docHeight);
  ctx.fill();
  
  // 文档折角
  ctx.fillStyle = colors.cupOutline;
  ctx.beginPath();
  ctx.moveTo(docX + docWidth/2 - 3 * scale, docY - docHeight/2);
  ctx.lineTo(docX + docWidth/2, docY - docHeight/2 + 3 * scale);
  ctx.lineTo(docX + docWidth/2, docY - docHeight/2);
  ctx.fill();
  
  // 5. 在杯子内部右侧绘制导航箭头
  const arrowX = cupX + 8 * scale;
  const arrowY = cupY - 3 * scale;
  const arrowSize = 9 * scale;
  
  ctx.fillStyle = colors.arrow;
  ctx.beginPath();
  ctx.moveTo(arrowX - arrowSize/2, arrowY);
  ctx.lineTo(arrowX + arrowSize/2 - 3 * scale, arrowY - arrowSize/3);
  ctx.lineTo(arrowX + arrowSize/2 - 3 * scale, arrowY - 1 * scale);
  ctx.lineTo(arrowX + arrowSize/2, arrowY);
  ctx.lineTo(arrowX + arrowSize/2 - 3 * scale, arrowY + 1 * scale);
  ctx.lineTo(arrowX + arrowSize/2 - 3 * scale, arrowY + arrowSize/3);
  ctx.closePath();
  ctx.fill();
  
  // 6. 在杯口上方添加蒸汽波浪线
  const steamX = cupX;
  const steamY = cupY - cupHeight/2 - 8 * scale;
  
  ctx.strokeStyle = colors.steam;
  ctx.lineWidth = 2 * scale;
  
  for (let i = 0; i < 3; i++) {
    const offsetX = (i - 1) * 4 * scale;
    const offsetY = i * 2 * scale;
    
    ctx.beginPath();
    ctx.moveTo(steamX + offsetX, steamY - offsetY);
    ctx.quadraticCurveTo(steamX + offsetX - 3 * scale, steamY - offsetY - 4 * scale, steamX + offsetX, steamY - offsetY - 8 * scale);
    ctx.quadraticCurveTo(steamX + offsetX + 3 * scale, steamY - offsetY - 12 * scale, steamX + offsetX, steamY - offsetY - 16 * scale);
    ctx.stroke();
  }
  
  return canvas;
}

// 生成不同尺寸的图标
function generateIcons() {
  try {
    // 128x128 主图标
    const icon128 = createIcon(128);
    const buffer128 = icon128.toBuffer('image/png');
    fs.writeFileSync('./icons/icon.png', buffer128);
    console.log('✅ 128x128 图标已生成: icons/icon.png');
    
    // 256x256 高分辨率图标
    const icon256 = createIcon(256);
    const buffer256 = icon256.toBuffer('image/png');
    fs.writeFileSync('./icons/icon-256.png', buffer256);
    console.log('✅ 256x256 图标已生成: icons/icon-256.png');
    
    console.log('🎨 新图标生成完成！');
    console.log(`📊 128x128 文件大小: ${(buffer128.length / 1024).toFixed(2)} KB`);
    console.log(`📊 256x256 文件大小: ${(buffer256.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('❌ 图标生成失败:', error.message);
    console.log('💡 请确保已安装 canvas 依赖: npm install canvas');
  }
}

// 执行生成
generateIcons(); 