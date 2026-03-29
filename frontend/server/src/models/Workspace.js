const mongoose = require('mongoose');

const workspaceSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a workspace name'],
        },
        description: {
            type: String,
        },
        domain: {
            type: String,
            default: 'custom',
        },
        color: {
            type: String,
            default: '#8b5cf6',
        },
        owner_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        member_emails: {
            type: [String],
            default: [],
        },
        leader_emails: {
            type: [String],
            default: [],
        },
        is_archived: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

// Optimize for fetching by user
workspaceSchema.index({ owner_id: 1 });
workspaceSchema.index({ member_emails: 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);
