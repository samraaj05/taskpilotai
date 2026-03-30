const mongoose = require('mongoose');
let faker;

if (process.env.NODE_ENV !== 'production') {
  faker = require('@faker-js/faker').faker;
}
const TeamMember = require('../models/TeamMember');
const Project = require('../models/Project');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');
const AIAnalysis = require('../models/AIAnalysis');
const logger = require('./logger');
const { invalidateByPrefix } = require('./cache');

const INDIAN_NAMES = [
    'Arjun Mehta', 'Priya Sharma', 'Rohan Gupta', 'Ananya Iyer', 'Siddharth Nair',
    'Ishani Verma', 'Vikram Singh', 'Kavya Reddy', 'Aditya Joshi', 'Neha Kapoor',
    'Abhishek Patil', 'Sneha Kulkarni', 'Rahul Deshmukh', 'Pooja Bhatia', 'Manish Pandey'
];

const ROLES = [
    'Project Manager', 'Senior Dev', 'Junior Dev', 'QA', 'UI Designer', 
    'DevOps', 'Data Analyst', 'Intern'
];

const DEPARTMENTS = [
    'Engineering', 'Product', 'Design', 'QA', 'Operations', 'Data Science'
];

const SKILLS_POOL = [
    'React', 'Node.js', 'Python', 'AWS', 'MongoDB', 'PostgreSQL', 
    'TypeScript', 'Docker', 'Kubernetes', 'Figma', 'Jest', 'Redis'
];

/**
 * Seeds a workspace with enterprise demo data (Force Populate / Extend)
 * @param {string} workspaceId 
 * @param {object} owner 
 */
const seedWorkspaceData = async (workspaceId, owner) => {
    logger.info(`[SEEDER] Starting Enterprise Scale Seeding for Workspace: ${workspaceId}`);
    try {
        const wsId = new mongoose.Types.ObjectId(workspaceId);

        // 1. Members Top-up (Target: 25)
        const currentMembers = await TeamMember.find({ workspaceId: wsId });
        const currentEmails = currentMembers.map(m => m.user_email);
        const membersToCreate = Math.max(0, 25 - currentMembers.length);

        if (membersToCreate > 0) {
            const newMembers = [];
            if (faker) {
                for (let i = 0; i < membersToCreate; i++) {
                    const name = Math.random() > 0.4 ? faker.helpers.arrayElement(INDIAN_NAMES) : faker.person.fullName();
                    const email = faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] }).toLowerCase();
                    
                    if (currentEmails.includes(email)) continue;

                    newMembers.push({
                        user_email: email,
                        workspaceId: wsId,
                        display_name: name,
                        job_title: faker.helpers.arrayElement(ROLES),
                        department: faker.helpers.arrayElement(DEPARTMENTS),
                        role: 'member',
                        skills: faker.helpers.arrayElements(SKILLS_POOL, { min: 3, max: 5 }).map(s => ({
                            name: s,
                            level: faker.helpers.arrayElement(['intermediate', 'advanced', 'expert']),
                            years_experience: faker.number.int({ min: 1, max: 8 })
                        })),
                        status: faker.helpers.arrayElement(['online', 'offline', 'busy']),
                        joined_date: faker.date.recent({ days: 180 }),
                        performance_metrics: {
                            tasks_completed: faker.number.int({ min: 5, max: 40 }),
                            productivity_score: faker.number.int({ min: 75, max: 98 }),
                            on_time_rate: faker.number.int({ min: 80, max: 100 })
                        },
                        current_workload: faker.number.int({ min: 20, max: 90 })
                    });
                    currentEmails.push(email);
                }
            }
            if (newMembers.length > 0) {
                await TeamMember.create(newMembers);
                logger.info(`[SEEDER] Added ${newMembers.length} new members.`);
            }
        }

        // 2. Projects Top-up (Target: 10)
        let projects = await Project.find({ workspaceId: wsId });
        const projectsToCreate = Math.max(0, 10 - projects.length);

        if (projectsToCreate > 0) {
            if (faker) {
                for (let i = 0; i < projectsToCreate; i++) {
                    const project = await Project.create({
                        workspaceId: wsId,
                        name: `${faker.commerce.productName()} System`,
                        description: faker.company.catchPhrase(),
                        status: i < 5 ? 'active' : faker.helpers.arrayElement(['active', 'planning', 'completed']),
                        health_status: faker.helpers.arrayElement(['excellent', 'good', 'at_risk']),
                        progress: faker.number.int({ min: 10, max: 90 }),
                        owner_email: owner.email,
                        member_emails: faker.helpers.arrayElements(currentEmails, { min: 4, max: 7 }),
                        target_end_date: faker.date.future({ years: 0.3 })
                    });
                    projects.push(project);
                }
            }
            logger.info(`[SEEDER] Created ${projectsToCreate} additional projects.`);
        }

        // Ensure at least 5 active projects for dashboard compatibility
        const activeProjectsCount = projects.filter(p => p && p.status === 'active').length;
        if (activeProjectsCount < 5) {
            const projectsToActivate = projects.filter(p => p && p.status !== 'active').slice(0, 5 - activeProjectsCount);
            for (const p of projectsToActivate) {
                await Project.findByIdAndUpdate(p._id, { status: 'active' });
            }
        }

        // Ensure currentEmails has at least the owner for assignment fallbacks
        if (owner && owner.email && !currentEmails.includes(owner.email)) {
            currentEmails.push(owner.email);
        }

        // 3. Task Enrichment (Target: 10+ per project, 80+ total)
        logger.info(`[SEEDER] Enriching tasks for ${projects.length} projects...`);

        for (const project of projects) {
            if (!project || !project._id) continue;
            
            const currentTasksCount = await Task.countDocuments({ project_id: project._id });
            const tasksNeeded = Math.max(0, 10 - currentTasksCount);

            if (tasksNeeded > 0) {
                const tasksToAdd = [];
                if (faker) {
                    for (let j = 0; j < tasksNeeded; j++) {
                        const status = faker.helpers.arrayElement(['todo', 'in_progress', 'done', 'review', 'backlog']);
                        tasksToAdd.push({
                            workspaceId: wsId,
                            project_id: project._id,
                            title: `${faker.hacker.verb()} ${faker.hacker.adjective()} ${faker.hacker.noun()}`,
                            description: faker.hacker.phrase(),
                            status,
                            priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
                            assignee_email: faker.helpers.arrayElement(project.member_emails && project.member_emails.length > 0 ? project.member_emails : currentEmails),
                            due_date: faker.date.soon({ days: 30 }),
                            estimated_hours: faker.number.int({ min: 2, max: 16 }),
                            actual_hours: status === 'done' ? faker.number.int({ min: 2, max: 20 }) : 0,
                            tags: faker.helpers.arrayElements(['frontend', 'backend', 'api', 'ui', 'bug', 'feature'], { min: 1, max: 3 }),
                            completed_date: status === 'done' ? new Date() : null
                        });
                    }
                }
                if (tasksToAdd.length > 0) {
                    await Task.insertMany(tasksToAdd);
                }
            }
        }

        // Final sanity check for dashboard thresholds (40+ Open, 10+ Done)
        const finalOpenCount = await Task.countDocuments({ workspaceId: wsId, status: { $ne: 'done' } });
        const finalDoneCount = await Task.countDocuments({ workspaceId: wsId, status: 'done' });

        if (finalOpenCount < 40) {
            const activeProject = projects.find(p => p && p.status === 'active') || projects[0];
            if (activeProject) {
                const extraTasks = [];
                const needed = 40 - finalOpenCount;
                for (let k = 0; k < needed; k++) {
                    extraTasks.push({
                        workspaceId: wsId,
                        project_id: activeProject._id,
                        title: `Optimization Requirement ${k + 1}`,
                        status: 'todo',
                        priority: 'medium',
                        assignee_email: owner.email,
                        due_date: new Date()
                    });
                }
                await Task.insertMany(extraTasks);
            }
        }

        if (finalDoneCount < 10) {
            const tasksToClose = await Task.find({ workspaceId: wsId, status: { $ne: 'done' } }).limit(10 - finalDoneCount);
            if (tasksToClose.length > 0) {
                const ids = tasksToClose.map(t => t._id);
                await Task.updateMany({ _id: { $in: ids } }, { status: 'done', completed_date: new Date() });
            }
        }

        // 4. Activity Logs (Target: 50+ total)
        const currentLogs = await AuditLog.countDocuments({ workspaceId: wsId });
        if (currentLogs < 50) {
            const logsToCreate = 50 - currentLogs;
            const newLogs = [];
            const fallbackActorId = owner && (owner._id || owner.id) || new mongoose.Types.ObjectId();
            const fallbackEmail = owner && owner.email || 'admin@taskpilot.ai';
            
            if (faker) {
                for (let i = 0; i < logsToCreate; i++) {
                    newLogs.push({
                        workspaceId: wsId,
                        actor: fallbackActorId,
                        actor_email: fallbackEmail,
                        action: faker.helpers.arrayElement(['TASK_CREATED', 'TASK_UPDATED', 'PROJECT_CREATED', 'TEAM_MEMBER_ADDED']),
                        entity_type: faker.helpers.arrayElement(['Task', 'Project', 'TeamMember']),
                        entity_id: wsId,
                        metadata: { details: 'Enterprise scale data generation' },
                        ip_address: faker.internet.ip(),
                        timestamp: faker.date.recent({ days: 14 })
                    });
                }
            }
            if (newLogs.length > 0) {
                await AuditLog.insertMany(newLogs);
            }
        }

        // 5. Cache & Analytics Invalidation
        try {
            await invalidateByPrefix(`analytics:${workspaceId}`);
            await invalidateByPrefix(`insights:${workspaceId}`);
        } catch (e) {
            logger.warn(`[SEEDER] Cache invalidation skipped: ${e.message}`);
        }
        
        // 6. Force AI Analysis Placeholder
        await AIAnalysis.findOneAndUpdate(
            { workspaceId: wsId, analysis_type: 'performance_analysis' },
            {
                target_entity_type: 'workspace',
                explanation: 'Workspace dataset forcefully extended to full enterprise scale. Metrics recalculated.',
                results: {
                    team_productivity: 94,
                    completion_rate: 88,
                    throughput: [18, 22, 25, 30, 35, 32],
                    overdue_risk: 4,
                    last_updated: new Date()
                }
            },
            { upsert: true, new: true }
        );

        logger.info(`[SEEDER] SUCCESS: Workspace ${workspaceId} is now Enterprise Scale.`);
        return { 
            success: true, 
            members: await TeamMember.countDocuments({ workspaceId: wsId }),
            projects: await Project.countDocuments({ workspaceId: wsId }),
            tasks: await Task.countDocuments({ workspaceId: wsId })
        };

    } catch (error) {
        logger.error(`[SEEDER] FATAL ERROR during seeding: ${error.message}`);
        throw error;
    }
};

module.exports = { seedWorkspaceData };
