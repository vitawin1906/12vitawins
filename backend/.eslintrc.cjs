/* .eslintrc.cjs */
module.exports = {
    root: true,
    env: { es2022: true, node: true },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
        sourceType: 'module',
        ecmaVersion: 'latest',
    },
    plugins: ['@typescript-eslint', 'import', 'unicorn'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:unicorn/recommended',
    ],
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
            typescript: {
                project: './tsconfig.json',
                alwaysTryTypes: true,
            },
            node: {
                extensions: ['.js', '.ts', '.d.ts'],
                moduleDirectory: ['node_modules', 'src'],
            },
        },
    },
    rules: {
        // не требуем расширений у импортов
        'import/extensions': ['error', 'ignorePackages', {
            ts: 'never',
            tsx: 'never',
            js: 'never',
            jsx: 'never'
        }],
        // удобство для dev; при желании включай обратно
        'import/no-unresolved': 'off',
        'unicorn/prefer-module': 'off',
        'unicorn/no-empty-file': 'off',
    },
    overrides: [
        { files: ['**/*.ts'], rules: { 'no-undef': 'off' } },
    ],
};
