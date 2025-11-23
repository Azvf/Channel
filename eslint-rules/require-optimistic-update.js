/**
 * ESLint Rule: require-optimistic-update
 * 
 * 检测 Mutation Hook 是否缺少乐观更新处理
 * 
 * 规则：所有使用 useMutation 的地方，如果操作是简单的 CRUD（create/update/delete），
 * 应该实现乐观更新（onMutate）
 * 
 * 注意：这是一个启发式规则，可能产生误报。主要用于提醒开发者考虑乐观更新。
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '建议在 Mutation Hook 中实现乐观更新',
      category: 'Best Practices',
      recommended: false, // 作为建议而非强制
    },
    messages: {
      requireOptimisticUpdate: '建议为 CRUD 操作实现乐观更新 (onMutate)，以提升用户体验。参考《交互手册》3.1 节。',
    },
    schema: [
      {
        type: 'object',
        properties: {
          mutationMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['create', 'update', 'delete', 'add', 'remove'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const mutationMethods = options.mutationMethods || ['create', 'update', 'delete', 'add', 'remove'];
    
    function isMutationMethod(methodName) {
      if (!methodName || typeof methodName !== 'string') return false;
      const lowerName = methodName.toLowerCase();
      return mutationMethods.some(m => lowerName.includes(m));
    }
    
    function hasOptimisticUpdate(mutationConfig) {
      if (!mutationConfig || mutationConfig.type !== 'ObjectExpression') return false;
      
      return mutationConfig.properties.some(prop => {
        const key = prop.key?.name || prop.key?.value;
        return key === 'onMutate' || key === 'optimisticUpdate';
      });
    }
    
    return {
      CallExpression(node) {
        // 检测 useMutation 调用
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'useMutation'
        ) {
          const args = node.arguments;
          if (args.length === 0) return;
          
          // 检查第一个参数（mutation function）
          const mutationFn = args[0];
          let mutationFnName = '';
          
          // 提取函数名
          if (mutationFn.type === 'Identifier') {
            mutationFnName = mutationFn.name;
          } else if (mutationFn.type === 'ArrowFunctionExpression' && mutationFn.body) {
            // 尝试从箭头函数体中提取方法名
            // 这是一个简化的启发式检测
          }
          
          // 检查第二个参数（mutation options）
          const options = args[1];
          if (options && !hasOptimisticUpdate(options)) {
            // 检查 mutation function 名称是否包含 CRUD 关键词
            if (isMutationMethod(mutationFnName)) {
              context.report({
                node: options || node,
                messageId: 'requireOptimisticUpdate',
              });
            }
          }
        }
      },
    };
  },
};

