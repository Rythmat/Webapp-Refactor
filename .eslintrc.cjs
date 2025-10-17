// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:sonarjs/recommended',
    'plugin:tailwindcss/recommended',
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'no-warning-comments': 'warn',
    'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
    'import/no-named-as-default-member': 'off',
    'import/no-default-export': 'error',
    'import/no-duplicates': 'off',
    'import/no-named-as-default': 'off',
    'no-duplicate-imports': 'error',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'sonarjs/cognitive-complexity': ['error', 16],
    'sonarjs/no-duplicate-string': 'off',
    'tailwindcss/no-custom-classname': [
      'error',
      {
        whitelist: ['toaster'],
      },
    ],
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'before',
          },
        ],
        'newlines-between': 'never',
        alphabetize: {
          order: 'asc',
          caseInsensitive: false,
        },
      },
    ],
    'react/jsx-sort-props': [
      'error',
      {
        callbacksLast: true,
        shorthandFirst: true,
        shorthandLast: false,
        ignoreCase: true,
        noSortAlphabetically: false,
        reservedFirst: true,
      },
    ],
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['tsconfig.app.json'],
      },
      node: true,
    },
    react: {
      version: 'detect',
    },
    tailwindcss: {
      config: './tailwind.config.ts',
    },
  },
  overrides: [
    {
      files: ['.eslintrc.js'],
      env: { node: true },
    },
    {
      files: [
        './tailwind.config.ts',
        './postcss.config.js',
        './vite.config.ts',
      ],
      rules: {
        'import/no-default-export': 'off',
      },
    },
  ],
};
