import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Search, Filter, LayoutGrid, List, FolderKanban, Calendar,
  Users, Target, AlertTriangle, CheckCircle2, Clock, MoreVertical,
  Edit, Trash2, Archive, Brain, Sparkles, ArrowRight, TrendingUp
} from 'lucide-react';
import { format, differenceInDays, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/lib/utils';

import ProjectForm from '@/components/projects/ProjectForm';
import ProjectCard from '@/components/dashboard/ProjectCard';

const statusFilters = [
  { value: 'all', label: 'All Projects' },
  { value: 'active', label: 'Active' },
  { value: 'planning', label: 'Planning' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

export default function Projects() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === 'true') {
      setShowForm(true);
    }
    if (params.get('id')) {
      // Load specific project
    }
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ is_archived: false }, '-created_date', 100),
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => base44.entities.Workspace.list(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.TeamMember.filter({ is_active: true }),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowForm(false);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingProject(null);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.update(id, { is_archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProjectTasks = (projectId) => tasks.filter(t => t.project_id === projectId);

  const getProjectProgress = (projectId) => {
    const projectTasks = getProjectTasks(projectId);
    if (projectTasks.length === 0) return 0;
    const completed = projectTasks.filter(t => t.status === 'done').length;
    return Math.round((completed / projectTasks.length) * 100);
  };

  const handleCreateProject = (data) => {
    createProjectMutation.mutate({
      ...data,
      organization_id: workspaces.find(w => w.id === data.workspace_id)?.organization_id,
      status: 'planning',
      progress: 0,
      health_status: 'good',
    });
  };

  const handleUpdateProject = (data) => {
    updateProjectMutation.mutate({ id: editingProject.id, data });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 mt-1">
            Manage and track all your projects in one place
          </p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800/50 border-slate-700"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {statusFilters.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg">
          <Button
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('grid')}
            className={view === 'grid' ? 'bg-slate-700' : ''}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
            className={view === 'list' ? 'bg-slate-700' : ''}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <FolderKanban className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{projects.length}</p>
              <p className="text-xs text-slate-400">Total Projects</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {projects.filter(p => p.status === 'active').length}
              </p>
              <p className="text-xs text-slate-400">Active</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {projects.filter(p => p.health_status === 'at_risk' || p.health_status === 'critical').length}
              </p>
              <p className="text-xs text-slate-400">At Risk</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / (projects.length || 1))}%
              </p>
              <p className="text-xs text-slate-400">Avg Progress</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Projects Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="bg-slate-800/50 border-slate-700/50 p-5 animate-pulse">
              <div className="h-6 bg-slate-700 rounded w-3/4 mb-4" />
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
              <div className="h-2 bg-slate-700 rounded w-full mt-4" />
            </Card>
          ))}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <div key={project.id} className="relative group">
              <ProjectCard
                project={{
                  ...project,
                  progress: getProjectProgress(project.id)
                }}
                onClick={() => setSelectedProject(project)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-slate-800/80"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-slate-700">
                  <DropdownMenuItem onClick={() => setEditingProject(project)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem
                    onClick={() => deleteProjectMutation.mutate(project.id)}
                    className="text-rose-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <Card className="col-span-full bg-slate-800/50 border-slate-700/50 p-12 text-center">
              <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-1">No projects found</h3>
              <p className="text-slate-400 text-sm mb-4">
                {search ? 'Try adjusting your search or filters' : 'Get started by creating your first project'}
              </p>
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </Card>
          )}
        </div>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Project</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Progress</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Deadline</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Team</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Health</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(project => {
                  const progress = getProjectProgress(project.id);
                  const daysLeft = project.target_end_date ?
                    differenceInDays(new Date(project.target_end_date), new Date()) : null;

                  return (
                    <tr
                      key={project.id}
                      className="border-b border-slate-700/50 hover:bg-slate-800/50 cursor-pointer"
                      onClick={() => setSelectedProject(project)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-white">{project.name}</p>
                          <p className="text-xs text-slate-400 truncate max-w-xs">
                            {project.description || 'No description'}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className={cn(
                          "text-xs",
                          project.status === 'active' && "bg-emerald-500/20 text-emerald-400",
                          project.status === 'planning' && "bg-blue-500/20 text-blue-400",
                          project.status === 'on_hold' && "bg-amber-500/20 text-amber-400",
                          project.status === 'completed' && "bg-violet-500/20 text-violet-400",
                        )}>
                          {project.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4 w-40">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-1.5 flex-1 bg-slate-700" />
                          <span className="text-xs text-slate-400 w-8">{progress}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {project.target_end_date ? (
                          <div className={cn(
                            "text-sm",
                            daysLeft < 0 ? "text-rose-400" : daysLeft < 7 ? "text-amber-400" : "text-slate-300"
                          )}>
                            {format(new Date(project.target_end_date), 'MMM d, yyyy')}
                            {daysLeft !== null && (
                              <span className="text-xs ml-1">
                                ({daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">No deadline</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex -space-x-2">
                          {project.member_emails?.slice(0, 3).map((email, i) => (
                            <Avatar key={i} className="h-6 w-6 border-2 border-slate-800">
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[10px]">
                                {email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {project.member_emails?.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center">
                              <span className="text-[10px] text-slate-300">+{project.member_emails.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className={cn(
                          "text-xs",
                          project.health_status === 'excellent' && "bg-emerald-500/20 text-emerald-400",
                          project.health_status === 'good' && "bg-blue-500/20 text-blue-400",
                          project.health_status === 'at_risk' && "bg-amber-500/20 text-amber-400",
                          project.health_status === 'critical' && "bg-rose-500/20 text-rose-400",
                        )}>
                          {project.health_status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingProject(project); }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-rose-400" onClick={(e) => { e.stopPropagation(); deleteProjectMutation.mutate(project.id); }}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Project Form Dialog */}
      <ProjectForm
        open={showForm || !!editingProject}
        onClose={() => { setShowForm(false); setEditingProject(null); }}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        project={editingProject}
        workspaces={workspaces}
        members={members}
        isLoading={createProjectMutation.isPending || updateProjectMutation.isPending}
      />
    </div>
  );
}