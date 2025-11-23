// ==========================================
// Plop.js 配置文件 - 代码生成器
// ==========================================
// 
// 使用说明：
//   npm run gen          - 交互式选择生成器
//   npm run gen:component - 直接生成组件
// 
// ==========================================

export default function (plop) {
  // ==========================================
  // 组件生成器
  // ==========================================
  plop.setGenerator('component', {
    description: '创建新的 UI 组件（包含组件本体、Storybook 和视觉回归测试）',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: '组件名称 (PascalCase, e.g. GlassCard):',
        validate: (value) => {
          if (!value) return '组件名称不能为空';
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
            return '组件名称必须是 PascalCase（首字母大写，无空格）';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'type',
        message: '组件类型?',
        choices: [
          { name: 'Dumb Component (展示型组件，无状态逻辑)', value: 'dumb' },
          { name: 'Smart Component (容器型组件，包含业务逻辑)', value: 'smart' },
        ],
      },
    ],
    actions: function (data) {
      const actions = [];
      const basePath = 'src/popup/components';
      const testBasePath = 'tests/components';

      // 1. 组件本体
      actions.push({
        type: 'add',
        path: `${basePath}/{{name}}.tsx`,
        templateFile: 'plop-templates/component/{{type}}.hbs',
      });

      // 2. Storybook (强制)
      actions.push({
        type: 'add',
        path: `${basePath}/{{name}}.stories.tsx`,
        templateFile: 'plop-templates/component/stories.hbs',
      });

      // 3. 视觉回归测试 (强制)
      actions.push({
        type: 'add',
        path: `${testBasePath}/{{name}}.ct.spec.tsx`,
        templateFile: 'plop-templates/test/visual-regression.hbs',
      });

      return actions;
    },
  });
}


