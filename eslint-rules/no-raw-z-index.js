/**
 * ESLint Rule: no-raw-z-index
 * 
 * 禁止使用魔法数字 z-index，必须使用 tokens.css 中的语义变量
 * 
 * 错误示例:
 *   z-index: 999;
 *   zIndex: 999
 * 
 * 正确示例:
 *   z-index: var(--z-modal-content);
 *   zIndex: 'var(--z-modal-content)'
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止使用魔法数字 z-index，必须使用设计 Token',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      noRawZIndex: '禁止使用魔法数字 z-index。请使用 tokens.css 中的语义变量，如 var(--z-modal-content)',
    },
    schema: [],
  },
  create(context) {
    // 允许的 z-index 值：CSS 变量、inherit、auto、initial、unset
    const ALLOWED_VALUES = /^(var\(--z-|inherit|auto|initial|unset|0|-1)/;
    
    function checkZIndex(node, value) {
      if (!value) return;
      
      // 检查字符串值
      if (typeof value === 'string') {
        if (!ALLOWED_VALUES.test(value.trim())) {
          context.report({
            node,
            messageId: 'noRawZIndex',
          });
        }
        return;
      }
      
      // 检查数字值（魔法数字）
      if (typeof value === 'number') {
        // 允许 0 和 -1（用于 hidden）
        if (value === 0 || value === -1) return;
        
        context.report({
          node,
          messageId: 'noRawZIndex',
        });
      }
    }
    
    return {
      // CSS-in-JS: style={{ zIndex: 999 }}
      Property(node) {
        if (
          (node.key.name === 'zIndex' || node.key.value === 'z-index') &&
          node.value
        ) {
          const value = node.value.value || node.value.raw;
          checkZIndex(node, value);
        }
      },
      // CSS: z-index: 999;
      'Declaration[property="z-index"]'(node) {
        const value = node.value;
        if (value) {
          checkZIndex(node, value);
        }
      },
    };
  },
};

