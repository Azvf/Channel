import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold mb-4">
            GameplayTag Extension
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            欢迎使用标签管理系统
          </h1>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full"></div>
              <p className="text-gray-600">
                基于 React + TypeScript + Tailwind 构建
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full"></div>
              <p className="text-gray-600">
                保留底层核心功能模块
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-purple-400 rounded-full"></div>
              <p className="text-gray-600">
                准备就绪，等待开发
              </p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Version 1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

