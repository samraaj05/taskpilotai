const mongoose = require('mongoose');

const systemConfigSchema = mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
