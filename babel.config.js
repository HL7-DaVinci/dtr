module.exports = {
    "presets": [
        [
            "@babel/preset-env",
            {

                "corejs": "2.0.0",
                "useBuiltIns": "entry",
                "targets": {
                    "esmodules": true,
                    "ie": "11"
                }
            }
        ]
    ]
};