const { exec } = require('child_process');

// 指定要编译的文件
const files = [
  'src/reader/propertiesReader.ts',
  'src/reader/propertyValueParser.ts',
  'src/test/reader/propertiesReaderTest.ts',
  'src/test/reader/propertyValueParserTest.ts'
];

// 编译指定的文件
exec(`npx tsc -p tsconfig.json ${files.join(' ')}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`编译完成: ${stdout}`);
}); 