require('dotenv').config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

// Models
const User = require('./src/models/User');
const Workspace = require('./src/models/Workspace');
const TeamMember = require('./src/models/TeamMember');
const Project = require('./src/models/Project');
const Task = require('./src/models/Task');
const AuditLog = require('./src/models/AuditLog');
const AIAnalysis = require('./src/models/AIAnalysis');

const guaranteedWorkspaces = [
    { name: 'Engineering', domain: 'core_engineering', desc: 'Core product engineering and features.' },
    { name: 'AI Research', domain: 'it', desc: 'LLM integration and advanced analytics.' },
    { name: 'DevOps', domain: 'it', desc: 'Infrastructure and deployment.' },
    { name: 'Product Management', domain: 'business', desc: 'Strategy and execution.' },
    { name: 'Data Analytics', domain: 'finance', desc: 'Data insights and visualization.' },
    { name: 'Marketing', domain: 'marketing', desc: 'Growth hacking and campaign management.' }
];

const seedEnterprise = async (targetUserEmail = null) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGO_URI);
        }

        console.log('--- ENTERPRISE SEEDING START ---');

        const password = await bcrypt.hash('admin123', 10);
        let demoUser;

        if (targetUserEmail) {
            demoUser = await User.findOne({ email: targetUserEmail });
            if (!demoUser) {
                demoUser = await User.create({
                    email: targetUserEmail,
                    name: targetUserEmail.split('@')[0],
                    password,
                    role: 'user'
                });
            }
        } else {
            demoUser = await User.findOneAndUpdate(
                { email: 'admin@taskpilot.ai' },
                { name: 'System Admin', password, role: 'admin' },
                { upsert: true, new: true }
            );
        }

        for (const wsInfo of guaranteedWorkspaces) {
            const wsName = `${wsInfo.name} Workspace`;
            let workspace = await Workspace.findOne({ name: wsName });

            if (!workspace) {
                workspace = await Workspace.create({
                    name: wsName,
                    description: wsInfo.desc,
                    domain: wsInfo.domain,
                    owner_id: demoUser._id,
                    member_emails: [demoUser.email],
                    leader_emails: [demoUser.email]
                });
                console.log(`Created Workspace: ${wsName}`);
            }

            // 1. Ensure user is a Member
            let userMember = await TeamMember.findOne({ user_email: demoUser.email, workspaceId: workspace._id });
            if (!userMember) {
                userMember = await TeamMember.create({
                    user_email: demoUser.email,
                    workspaceId: workspace._id,
                    display_name: demoUser.name,
                    role: 'admin',
                    department: wsInfo.name,
                    job_title: 'Director',
                    status: 'online'
                });
            }

            // 2. Check Member Count
            const memberCount = await TeamMember.countDocuments({ workspaceId: workspace._id });
            if (memberCount < 10) {
                console.log(`Seeding members for ${wsName}...`);
                const members = [];
                const wsEmails = [demoUser.email];
                for (let i = 0; i < 12; i++) {
                    const firstName = faker.person.firstName();
                    const lastName = faker.person.lastName();
                    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
                    wsEmails.push(email);
                    members.push({
                        user_email: email,
                        workspaceId: workspace._id,
                        display_name: `${firstName} ${lastName}`,
                        role: 'member',
                        department: wsInfo.name,
                        job_title: faker.person.jobTitle(),
                        status: faker.helpers.arrayElement(['online', 'offline', 'busy']),
                        performance_metrics: {
                            tasks_completed: faker.number.int({ min: 10, max: 50 }),
                            productivity_score: faker.number.int({ min: 70, max: 98 })
                        }
                    });
                }
                await TeamMember.create(members);
                workspace.member_emails = wsEmails;
                await workspace.save();
            }

            const allMembers = await TeamMember.find({ workspaceId: workspace._id });
            const memberEmails = allMembers.map(m => m.user_email);

            // 3. Seed Projects
            const projectCount = await Project.countDocuments({ workspaceId: workspace._id });
            if (projectCount < 3) {
                console.log(`Seeding projects for ${wsName}...`);
                const projects = [];
                for (let i = 0; i < 4; i++) {
                    projects.push({
                        workspaceId: workspace._id,
                        name: `${wsInfo.name} - ${faker.commerce.productName()}`,
                        description: faker.company.catchPhrase(),
                        status: 'active',
                        health_status: 'excellent',
                        progress: faker.number.int({ min: 20, max: 80 }),
                        owner_email: demoUser.email,
                        member_emails: faker.helpers.arrayElements(memberEmails, 8)
                    });
                }
                await Project.create(projects);
            }

            const allProjects = await Project.find({ workspaceId: workspace._id });

            // 4. Seed Tasks
            const taskCount = await Task.countDocuments({ workspaceId: workspace._id });
            if (taskCount < 50) {
                console.log(`Seeding tasks for ${wsName}...`);
                for (const proj of allProjects) {
                    const tasks = [];
                    for (let i = 0; i < 20; i++) {
                        const status = faker.helpers.arrayElement(['todo', 'in_progress', 'done', 'review']);
                        tasks.push({
                            workspaceId: workspace._id,
                            project_id: proj._id,
                            title: `${faker.hacker.verb()} ${faker.hacker.noun()}`,
                            description: faker.lorem.sentence(),
                            status,
                            priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
                            assignee_email: faker.helpers.arrayElement(proj.member_emails),
                            due_date: faker.date.future(),
                            completed_date: status === 'done' ? new Date() : null
                        });
                    }
                    await Task.create(tasks);
                }
            }

            // 5. Seed AI Analysis
            const analysisCount = await AIAnalysis.countDocuments({ workspaceId: workspace._id });
            if (analysisCount === 0) {
                await AIAnalysis.create({
                    workspaceId: workspace._id,
                    analysis_type: 'performance_analysis',
                    target_entity_type: 'workspace',
                    explanation: 'Enterprise performance baseline established.',
                    results: {
                        completion_rate: 85,
                        throughput: [12, 15, 18, 22, 25, 30],
                        leaderboard: allMembers.slice(0, 5).map(m => ({ name: m.display_name, score: 95 }))
                    }
                });
            }
        }

        console.log('--- ENTERPRISE SEEDING COMPLETE ---');
        return true;
    } catch (err) {
        console.error('Seeding Error:', err);
        throw err;
    }
};

module.exports = seedEnterprise;
if (require.main === module) {
    seedEnterprise().then(() => process.exit(0)).catch(() => process.exit(1));
}
