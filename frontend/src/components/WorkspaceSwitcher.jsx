import React from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Boxes, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const domainColors = {
    it: 'bg-blue-500',
    core_engineering: 'bg-emerald-500',
    business: 'bg-violet-500',
    marketing: 'bg-pink-500',
    hr: 'bg-amber-500',
    finance: 'bg-cyan-500',
    operations: 'bg-orange-500',
    custom: 'bg-slate-500',
};

export function WorkspaceSwitcher() {
    const { workspaces, activeWorkspace, switchWorkspace, isLoading } = useWorkspace();

    if (isLoading) return <div className="h-10 w-full animate-pulse bg-slate-800 rounded-md" />;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    className="w-full justify-between gap-2 px-3 py-6 h-auto hover:bg-slate-800 border border-slate-700/50 bg-slate-900/50"
                >
                    <div className="flex items-center gap-3 text-left overflow-hidden">
                        <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            activeWorkspace ? (domainColors[activeWorkspace.domain] || 'bg-violet-600') : 'bg-slate-700'
                        )}>
                            <Boxes className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="text-sm font-semibold text-white truncate">
                                {activeWorkspace?.name || 'Select Workspace'}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate uppercase tracking-wider">
                                {activeWorkspace?.domain || 'Organization'}
                            </span>
                        </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-slate-900 border-slate-700 text-white">
                <DropdownMenuLabel className="text-xs text-slate-500 font-normal">Workspaces</DropdownMenuLabel>
                {workspaces.map((ws) => (
                    <DropdownMenuItem 
                        key={ws._id}
                        onClick={() => switchWorkspace(ws._id)}
                        className={cn(
                            "flex items-center gap-3 p-2 cursor-pointer",
                            activeWorkspace?._id === ws._id ? "bg-violet-500/10 text-violet-400" : "hover:bg-slate-800"
                        )}
                    >
                        <div className={cn(
                            "h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold",
                            domainColors[ws.domain] || 'bg-slate-700'
                        )}>
                            {ws.name.charAt(0)}
                        </div>
                        <span className="text-sm truncate">{ws.name}</span>
                    </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="bg-slate-700" />
                
                <Link to="/workspaces">
                    <DropdownMenuItem className="flex items-center gap-3 cursor-pointer">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">Create New</span>
                    </DropdownMenuItem>
                </Link>
                
                <Link to="/settings">
                    <DropdownMenuItem className="flex items-center gap-3 cursor-pointer">
                        <Settings className="h-4 w-4" />
                        <span className="text-sm">Workspace Settings</span>
                    </DropdownMenuItem>
                </Link>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
