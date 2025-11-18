export default {
  // 控制流扁平化 - 打乱代码执行流程
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  
  // 死代码注入 - 添加无用代码干扰分析
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  
  // 调试保护 - 防止在调试器中运行
  debugProtection: true,
  debugProtectionInterval: 2000,
  
  // 禁用控制台输出 - 防止调试信息泄露
  disableConsoleOutput: true,
  
  // 标识符生成方式
  identifierNamesGenerator: 'hexadecimal',
  
  // 数字转表达式 - 将数字转换为复杂表达式
  numbersToExpressions: true,
  
  // 旋转字符串数组 - 随机排列字符串
  rotateStringArray: true,
  
  // 自我防护 - 防止修改代码
  selfDefending: true,
  
  // 字符串数组操作
  shuffleStringArray: true,
  
  // 简化代码结构
  simplify: true,
  
  // 字符串拆分 - 将字符串拆分成更小的片段
  splitStrings: true,
  splitStringsChunkLength: 5,
  
  // 字符串数组编码
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  
  // 对象键名转换
  transformObjectKeys: true,
  
  // 字符串数组阈值 - 多少比例的字符串会被转换
  stringArrayThreshold: 0.75,
  
  // 日志输出
  log: false,
  
  // Unicode 转义
  unicodeEscapeSequence: false
};

