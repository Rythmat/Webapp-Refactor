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
          {
            pattern: '@prism/**',
            group: 'internal',
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
    {
      // The Studio editor's design guardrails, for NEW code only (overhaul
      // plan 2.1): the primitives (src/daw/ui) and the shell built from
      // them (src/daw/shell). Colours come from src/daw/ui/tokens.ts, the
      // one file allowed to spell them; text stays at 11 px or more; and
      // stacking comes from the token scale. Legacy src/daw is not covered.
      files: [
        'src/daw/ui/**/*.ts',
        'src/daw/ui/**/*.tsx',
        'src/daw/shell/**/*.ts',
        'src/daw/shell/**/*.tsx',
      ],
      excludedFiles: [
        'src/daw/ui/tokens.ts',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
      rules: {
        'no-restricted-syntax': [
          'error',
          // Colour literals: hex anywhere, rgb()/hsl() with numbers in them.
          {
            selector:
              'Literal[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z_-])/]',
            message:
              'No hex colours outside src/daw/ui/tokens.ts: use a token (bg-daw-*, text-daw-*, dawVar(), getDawPalette()).',
          },
          {
            selector:
              'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z_-])/]',
            message:
              'No hex colours outside src/daw/ui/tokens.ts: use a token (bg-daw-*, text-daw-*, dawVar(), getDawPalette()).',
          },
          {
            selector:
              'JSXText[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z_-])/]',
            message: 'No hex colours outside src/daw/ui/tokens.ts.',
          },
          {
            selector: 'Literal[value=/(?:rgba?|hsla?)\\(\\s*\\d/]',
            message:
              'No rgb()/hsl() colours outside src/daw/ui/tokens.ts: add a token.',
          },
          {
            selector: 'TemplateElement[value.raw=/(?:rgba?|hsla?)\\(\\s*\\d/]',
            message:
              'No rgb()/hsl() colours outside src/daw/ui/tokens.ts: add a token.',
          },
          // Text under 11 px: Tailwind sizes, style objects, SVG and canvas.
          {
            selector:
              'Literal[value=/\\btext-\\[(?:length:)?(?:(?:\\d|10)(?:\\.\\d+)?px|0?\\.(?:[0-5]\\d*|6(?:[0-8]\\d*)?)r?em)\\]/]',
            message:
              'Text stays at 11 px or more (12 px unless an uppercase micro label): use TYPE_CLASS.',
          },
          {
            selector:
              'TemplateElement[value.raw=/\\btext-\\[(?:length:)?(?:(?:\\d|10)(?:\\.\\d+)?px|0?\\.(?:[0-5]\\d*|6(?:[0-8]\\d*)?)r?em)\\]/]',
            message:
              'Text stays at 11 px or more (12 px unless an uppercase micro label): use TYPE_CLASS.',
          },
          {
            selector: 'Property[key.name="fontSize"] > Literal[value<11]',
            message: 'Text stays at 11 px or more: use the TYPE tokens.',
          },
          {
            selector:
              'Property[key.name="fontSize"] > Literal[value=/^(?:\\d|10)(?:\\.\\d+)?px$/]',
            message: 'Text stays at 11 px or more: use the TYPE tokens.',
          },
          {
            selector:
              'JSXAttribute[name.name="fontSize"] > JSXExpressionContainer > Literal[value<11]',
            message: 'Text stays at 11 px or more: use the TYPE tokens.',
          },
          {
            selector:
              'JSXAttribute[name.name="fontSize"] > Literal[value=/^(?:\\d|10)(?:\\.\\d+)?(?:px)?$/]',
            message: 'Text stays at 11 px or more: use the TYPE tokens.',
          },
          {
            selector:
              'AssignmentExpression[left.property.name="font"] Literal[value=/(?:^|\\s)(?:\\d|10)(?:\\.\\d+)?px/]',
            message: 'Canvas text stays at 11 px or more.',
          },
          {
            selector:
              'AssignmentExpression[left.property.name="font"] TemplateElement[value.raw=/(?:^|\\s)(?:\\d|10)(?:\\.\\d+)?px/]',
            message: 'Canvas text stays at 11 px or more.',
          },
          // Literal z-indexes: take a layer from the Z scale instead.
          {
            selector: 'Property[key.name="zIndex"] > Literal[value!=/^var\\(/]',
            message:
              'No literal z-index: use a layer, z-[var(--daw-z-<layer>)] or Z.<layer> from tokens.ts.',
          },
          {
            selector: 'Property[key.name="zIndex"] > UnaryExpression',
            message:
              'No literal z-index: use a layer, z-[var(--daw-z-<layer>)] or Z.<layer> from tokens.ts.',
          },
          {
            selector:
              'Literal[value=/(?:^|[\\s:])-?z-(?:\\d+|\\[-?\\d+\\])(?![\\w-])/]',
            message:
              'No literal z-index class: use z-[var(--daw-z-<layer>)] from the token scale.',
          },
          {
            selector:
              'TemplateElement[value.raw=/(?:^|[\\s:])-?z-(?:\\d+|\\[-?\\d+\\])(?![\\w-])/]',
            message:
              'No literal z-index class: use z-[var(--daw-z-<layer>)] from the token scale.',
          },
        ],
      },
    },
  ],
};
