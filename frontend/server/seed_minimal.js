const mongoose = require('mongoose');
const Workspace = require('./src/models/Workspace');
const Project = require('./src/models/Project');
const Task = require('./src/models/Task');
const TeamMember = require('./src/models/TeamMember');
const User = require('./src/models/User');

const bcrypt = require('bcryptjs');

const seedMinimal = async (adminEmail = 'admin@taskpilot.ai') => {
    console.log(`[SEED_MINIMAL] Starting minimal seeding for ${adminEmail}`);
    try {
        let adminUser = await User.findOne({ email: adminEmail });
        if (!adminUser) {
            console.log(`[SEED_MINIMAL] Admin user not found: ${adminEmail}. Creating default admin...`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            adminUser = await User.create({
                full_name: 'Admin User',
                name: 'Admin User',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                is_email_verified: true
            });
        }

        // 1. Create Workspace
        const ws = await Workspace.create({
            name: 'Engineering',
            description: 'Core Engineering Team',
            owner_id: adminUser._id,
            member_emails: [adminEmail, 'dev1@example.com', 'dev2@example.com', 'qa1@example.com'],
            color: '#3b82f6'
        });

        // 2. Add Team Members
        await TeamMember.create([
            {
                user_email: adminEmail,
                workspaceId: ws._id,
                role: 'admin',
                display_name: adminUser.name || 'Admin User',
                status: 'online',
                productivity_score: 95
            },
            {
                user_email: 'dev1@example.com',
                workspaceId: ws._id,
                role: 'member',
                display_name: 'Alex Dev',
                department: 'Engineering',
                status: 'online'
            },
            {
                user_email: 'dev2@example.com',
                workspaceId: ws._id,
                role: 'member',
                display_name: 'Sam Coder',
                department: 'Engineering',
                status: 'offline'
            },
            {
                user_email: 'qa1@example.com',
                workspaceId: ws._id,
                role: 'member',
                display_name: 'Jamie QA',
                department: 'Quality Assurance',
                status: 'busy'
            }
        ]);

        // 3. Create 1 Project
        const project = await Project.create({
            name: 'Stabilization MVP',
            description: 'Minimal Viable Product for stable demo',
            workspaceId: ws._id,
            ownerId: adminUser._id,
            progress: 25,
            theme: 'blue'
        });

        // 4. Create 5 Tasks
        await Task.create([
            {
                title: 'Review System Logs',
                description: 'Check for any backend crashes',
                project_id: project._id,
                workspaceId: ws._id,
                status: 'done',
                priority: 'high',
                assignee_emails: [adminEmail]
            },
            {
                title: 'Optimize Database Queries',
                description: 'Remove heavy aggregations',
                project_id: project._id,
                workspaceId: ws._id,
                status: 'in_progress',
                priority: 'high',
                assignee_emails: ['dev1@example.com']
            },
            {
                title: 'Fix Frontend Infinite Loaders',
                description: 'Add fallbacks for failed APIs',
                project_id: project._id,
                workspaceId: ws._id,
                status: 'todo',
                priority: 'medium',
                assignee_emails: ['dev2@example.com']
            },
            {
                title: 'Test Error Boundaries',
                description: 'Ensure app does not crash on render',
                project_id: project._id,
                workspaceId: ws._id,
                status: 'todo',
                priority: 'low',
                assignee_emails: ['qa1@example.com']
            },
            {
                title: 'Disable Redis Requirements',
                description: 'Allow app to run in API-only mode seamlessly',
                project_id: project._id,
                workspaceId: ws._id,
                status: 'in_progress',
                priority: 'high',
                assignee_emails: [adminEmail]
            }
        ]);

        console.log(`[SEED_MINIMAL] Successfully created minimal demo framework.`);
    } catch (err) {
        console.error(`[SEED_MINIMAL] Error:`, err.message);
    }
};

module.exports = seedMinimal;
