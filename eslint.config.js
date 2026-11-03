import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'dev-dist', 'node_modules', 'public'] },
  {
    files: ['**/*.{js,jsx}'],
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser, ...globals.node, __APP_VERSION__: 'readonly' },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // 本项目未启用 React Compiler；以下规则是 hooks 插件新增的实验性约束，
      // 会大量误报现有 effect/ref 写法，故关闭。
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-refresh/only-export-components': 'off',
      'react/display-name': 'off',
      'no-unused-vars': 'off',
      // 现有代码大量使用空 catch/空函数作为静默失败语义。
      'no-empty': 'off',
      // 正则中的转义写法在浏览器兼容代码中很常见，不视为错误。
      'no-useless-escape': 'off',
    },
  },
];
