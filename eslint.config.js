import globals from 'globals';
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

// ----------------------------------------------------
// Common settings applied to all files
// ----------------------------------------------------
export const baseRules = [
    {
        // Files and directories ignored by ESLint
        ignores: [
            '**/node_modules/',
            '**/dist/',
            '**/build/',
            // Config files are not excluded but handled via overrides below.
            // Top-level exclusion is also an option for simplicity.
        ],
    },
    // ----------------------------------------------------
    // Settings applied to JavaScript files (UserScripts)
    // ----------------------------------------------------
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                // Enable browser environment only (Exclude Node.js globals to prevent misuse)
                ...globals.browser,

                // Temporal API
                Temporal: 'readonly',

                // Tampermonkey specific global variables
                GM_setValue: 'readonly',
                GM_getValue: 'readonly',
                GM_deleteValue: 'readonly',
                GM_listValues: 'readonly',
                GM_addValueChangeListener: 'readonly',
                GM_removeValueChangeListener: 'readonly',
                GM_xmlhttpRequest: 'readonly',
                GM_registerMenuCommand: 'readonly',
                GM_download: 'readonly',
                GM_addStyle: 'readonly', // Maintained for legacy compatibility if used
                // GM.* namespace
                GM: 'readonly',

                // Other UserScript environment variables
                exportFunction: 'readonly',
                unsafeWindow: 'readonly',
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-undef': 'error',
            'no-unused-vars': ['warn', { args: 'none' }],
            'no-debugger': 'error',
            eqeqeq: 'error',
            'no-var': 'error',
            'prefer-const': 'warn',
        },
    },
    // ----------------------------------------------------
    // Overrides for config files (These run in Node environment)
    // ----------------------------------------------------
    {
        files: ['eslint.config.js', 'prettier.config.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
];

export const prettierRules = prettierConfig;

export default [...baseRules, prettierRules];
