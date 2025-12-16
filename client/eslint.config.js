// ESLint v9 flat config
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
    // вместо .eslintignore
    { ignores: ['node_modules', 'dist', 'build', 'drizzle', 'coverage'] },

    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ['**/*.{ts,tsx,js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { react, 'react-hooks': reactHooks },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
        settings: { react: { version: 'detect' } },
    },
]
