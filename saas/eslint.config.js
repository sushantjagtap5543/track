const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                node: true,
                require: "readonly",
                process: "readonly",
                module: "readonly",
                __dirname: "readonly",
                console: "readonly",
                Buffer: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "off" // CommonJS require/module/process
        }
    }
];
