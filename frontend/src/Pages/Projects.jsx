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
import ProjectChat from '@/components/projects/ProjectChat';
import Leaderboard from '@/components/projects/Leaderboard';

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
    queryFn: async () => {
      const response = await base44.auth.me();
      return response.data; // The SDK or API returns { success, data: user }
    },
  });

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ is_archived: false }, '-created_date', 100),
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];

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

  const safeProjects = Array.isArray(projects) ? projects : [];

  const filteredProjects = safeProjects.filter(p => {
    const matchesSearch =
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
        statusFilter === 'all' || p.status === statusFilter;

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
      organization_id: workspaces.find(w => (w._id || w.id) === data.workspace_id)?.organization_id,
      status: 'planning',
      progress: 0,
      health_status: 'good',
    });
  };

  const handleUpdateProject = (data) => {
    updateProjectMutation.mutate({ id: editingProject._id || editingProject.id, data });
  };

  return <h1>Projects Page Working</h1>;
}