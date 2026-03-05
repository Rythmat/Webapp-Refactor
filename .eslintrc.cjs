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
    'no-console': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'no-unused-vars': 'off',
    'no-empty': 'off',
    'import/default': 'off',
    'import/no-named-as-default-member': 'off',
    'import/no-default-export': 'off',
    'import/no-duplicates': 'off',
    'import/no-named-as-default': 'off',
    'no-duplicate-imports': 'error',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/no-unescaped-entities': 'off',
    'react/jsx-sort-props': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'sonarjs/cognitive-complexity': 'off',
    'sonarjs/no-collapsible-if': 'off',
    'sonarjs/no-empty-collection': 'off',
    'sonarjs/no-nested-template-literals': 'off',
    'sonarjs/no-duplicate-string': 'off',
    'tailwindcss/no-custom-classname': 'off',
    'tailwindcss/classnames-order': 'off',
    'tailwindcss/enforces-shorthand': 'off',
    'tailwindcss/migration-from-tailwind-2': 'off',
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
    {
      files: ['src/daw/**/*.ts', 'src/daw/**/*.tsx'],
      rules: {
        'import/no-default-export': 'off',
        'import/order': 'off',
        'react/jsx-sort-props': 'off',
        'no-console': 'off',
        'sonarjs/cognitive-complexity': 'off',
      },
    },
    {
      files: ['src/daw/oracle-synth/components/**/*.tsx'],
      rules: {
        'import/default': 'off',
        'react/display-name': 'off',
        'react-hooks/exhaustive-deps': 'off',
        'sonarjs/cognitive-complexity': 'off',
      },
    },
  ],
};
