const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');

// 创建Mocha测试实例
function createMochaInstance() {
  return new Mocha({
    ui: 'bdd',
    color: true
  });
}

// 收集所有测试文件并添加到Mocha实例中
async function runTests() {
  // 创建Mocha实例
  const mocha = createMochaInstance();

  // 获取测试文件路径
  const testsRoot = path.resolve(__dirname, '.');
  const files = glob.sync('**/*Test.js', { cwd: testsRoot });

  // 添加所有测试文件
  files.forEach(file => {
    mocha.addFile(path.resolve(testsRoot, file));
  });

  // 运行测试
  return new Promise((resolve, reject) => {
    mocha.run(failures => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}

// 运行测试
runTests().catch(err => {
  console.error('运行测试时出错:', err);
  process.exit(1);
}); 