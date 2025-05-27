const fs = require('fs');

// 创建一个简单的HTML文件来生成图标
function createIconHTML() {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Java Properties Navigator Icon</title>
    <style>
        body { margin: 0; padding: 20px; background: #f0f0f0; }
        canvas { border: 1px solid #ccc; background: white; }
        .info { margin-top: 20px; font-family: Arial, sans-serif; }
    </style>
</head>
<body>
    <h1>Java Properties Navigator - 新图标设计</h1>
    <canvas id="iconCanvas" width="128" height="128"></canvas>
    <div class="info">
        <p><strong>设计特点：</strong></p>
        <ul>
            <li>现代化渐变背景（紫蓝色到青蓝色）</li>
            <li>白色咖啡杯轮廓，象征Java开发</li>
            <li>杯内文档图标，代表配置文件</li>
            <li>导航箭头，表示跳转功能</li>
            <li>蒸汽效果，增加生动感</li>
        </ul>
        <p><strong>使用说明：</strong></p>
        <ol>
            <li>右键点击上方的图标</li>
            <li>选择"图片另存为"</li>
            <li>保存为 icon.png</li>
            <li>替换 icons/icon.png 文件</li>
        </ol>
    </div>

    <script>
        const canvas = document.getElementById('iconCanvas');
        const ctx = canvas.getContext('2d');
        
        // 清除画布
        ctx.clearRect(0, 0, 128, 128);
        
        // 1. 绘制渐变背景圆形
        const centerX = 64;
        const centerY = 64;
        const radius = 60;
        
        const gradient = ctx.createLinearGradient(4, 4, 124, 124);
        gradient.addColorStop(0, '#4F46E5');  // 深紫蓝
        gradient.addColorStop(1, '#06B6D4');  // 青蓝色
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // 2. 绘制咖啡杯主体轮廓
        const cupX = 59;
        const cupY = 54;
        const cupWidth = 35;
        const cupHeight = 40;
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 杯子主体
        ctx.beginPath();
        ctx.moveTo(cupX - cupWidth/2, cupY - cupHeight/2);
        ctx.lineTo(cupX - cupWidth/2, cupY + cupHeight/2 - 8);
        ctx.quadraticCurveTo(cupX - cupWidth/2, cupY + cupHeight/2, cupX - cupWidth/2 + 8, cupY + cupHeight/2);
        ctx.lineTo(cupX + cupWidth/2 - 8, cupY + cupHeight/2);
        ctx.quadraticCurveTo(cupX + cupWidth/2, cupY + cupHeight/2, cupX + cupWidth/2, cupY + cupHeight/2 - 8);
        ctx.lineTo(cupX + cupWidth/2, cupY - cupHeight/2);
        ctx.stroke();
        
        // 3. 添加咖啡杯手柄
        const handleX = cupX + cupWidth/2 + 5;
        const handleY = cupY;
        const handleSize = 12;
        
        ctx.beginPath();
        ctx.arc(handleX, handleY, handleSize/2, -Math.PI/2, Math.PI/2, false);
        ctx.stroke();
        
        // 4. 在杯子内部左侧绘制文档图标
        const docX = cupX - 10;
        const docY = cupY;
        const docWidth = 10;
        const docHeight = 12;
        
        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(docX - docWidth/2, docY - docHeight/2, docWidth, docHeight);
        
        // 文档折角
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(docX + docWidth/2 - 3, docY - docHeight/2);
        ctx.lineTo(docX + docWidth/2, docY - docHeight/2 + 3);
        ctx.lineTo(docX + docWidth/2, docY - docHeight/2);
        ctx.fill();
        
        // 5. 在杯子内部右侧绘制导航箭头
        const arrowX = cupX + 8;
        const arrowY = cupY - 3;
        const arrowSize = 9;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(arrowX - arrowSize/2, arrowY);
        ctx.lineTo(arrowX + arrowSize/2 - 3, arrowY - arrowSize/3);
        ctx.lineTo(arrowX + arrowSize/2 - 3, arrowY - 1);
        ctx.lineTo(arrowX + arrowSize/2, arrowY);
        ctx.lineTo(arrowX + arrowSize/2 - 3, arrowY + 1);
        ctx.lineTo(arrowX + arrowSize/2 - 3, arrowY + arrowSize/3);
        ctx.closePath();
        ctx.fill();
        
        // 6. 在杯口上方添加蒸汽波浪线
        const steamX = cupX;
        const steamY = cupY - cupHeight/2 - 8;
        
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 3; i++) {
            const offsetX = (i - 1) * 4;
            const offsetY = i * 2;
            
            ctx.beginPath();
            ctx.moveTo(steamX + offsetX, steamY - offsetY);
            ctx.quadraticCurveTo(steamX + offsetX - 3, steamY - offsetY - 4, steamX + offsetX, steamY - offsetY - 8);
            ctx.quadraticCurveTo(steamX + offsetX + 3, steamY - offsetY - 12, steamX + offsetX, steamY - offsetY - 16);
            ctx.stroke();
        }
        
        console.log('✅ 图标已在画布上绘制完成！');
    </script>
</body>
</html>`;

  fs.writeFileSync('./icon-generator.html', htmlContent);
  console.log('🎨 图标生成器已创建: icon-generator.html');
  console.log('');
  console.log('📋 使用步骤：');
  console.log('1. 在浏览器中打开 icon-generator.html 文件');
  console.log('2. 右键点击画布上的图标');
  console.log('3. 选择"图片另存为"');
  console.log('4. 保存为 icon.png');
  console.log('5. 将文件移动到 icons/ 目录并替换现有的 icon.png');
  console.log('');
  console.log('🎯 新图标特点：');
  console.log('- 现代化渐变背景（#4F46E5 → #06B6D4）');
  console.log('- 白色咖啡杯轮廓，象征Java开发');
  console.log('- 杯内文档图标，代表配置文件');
  console.log('- 导航箭头，表示跳转功能');
  console.log('- 蒸汽效果，增加生动感');
}

// 生成图标HTML文件
createIconHTML(); 