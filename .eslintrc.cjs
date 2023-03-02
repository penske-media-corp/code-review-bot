module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/all',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:@typescript-eslint/strict',
    ],
    parserOptions: {
        project: [
            './tsconfig.json',
        ]
    },
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    root: true,
    rules: {
        '@typescript-eslint/block-spacing': 'off',
        '@typescript-eslint/consistent-indexed-object-style': 'off',
        '@typescript-eslint/comma-dangle': 'off',
        '@typescript-eslint/indent': ['error'],
        '@typescript-eslint/init-declarations': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
        '@typescript-eslint/non-nullable-type-assertion-style': 'off',
        '@typescript-eslint/prefer-readonly-parameter-types': 'off',
        '@typescript-eslint/quotes': ['error', 'single', { 'allowTemplateLiterals': false }],
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        'no-empty-function':'off',
        'sort-imports': ['error'],
    }
};
