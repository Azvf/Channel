/**
 * Custom ESLint Rules Plugin
 * 
 * 自定义规则集合，用于强制架构规范
 */

const noRawZIndex = require('./no-raw-z-index');
const requireOptimisticUpdate = require('./require-optimistic-update');

module.exports = {
  rules: {
    'no-raw-z-index': noRawZIndex,
    'require-optimistic-update': requireOptimisticUpdate,
  },
};

