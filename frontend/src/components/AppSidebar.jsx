import * as React from "react"
import {
    Calendar,
    Home,
    Inbox,
    Search,
    Settings,
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    Users,
    BarChart2,
    BrainCircuit,
    Boxes,
    Video,
    Activity,
    LogOut
} from "lucide-react"

import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { useAuth } from "@/context/AuthContext"
import { SidebarFooter } from "@/components/ui/sidebar"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link, useLocation } from "react-router-dom"

// Menu items.
const items = [
    {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
    },
    {
        title: "Projects",
        url: "/projects",
        icon: FolderKanban,
    },
    {
        title: "Tasks",
        url: "/tasks",
        icon: CheckSquare,
    },
    {
        title: "Team",
        url: "/team",
        icon: Users,
    },
    {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart2,
    },
    {
        title: "Activity Feed",
        url: "/activity",
        icon: Activity,
    },
    {
        title: "AI Insights",
        url: "/insights",
        icon: BrainCircuit,
    },
    {
        title: "Workspaces",
        url: "/workspaces",
        icon: Boxes,
    },
    {
        title: "Google Meet",
        url: `${import.meta.env.VITE_API_URL}/api/google/auth`,
        icon: Video,
        isExternal: true
    },
    {
        title: "Settings",
        url: "/settings",
        icon: Settings,
    }
]

export function AppSidebar() {
    const location = useLocation();
    const { logout } = useAuth();

    return (
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <div className="p-4 mb-2 flex items-center gap-3">
                        <img src="/logo.png" alt="TaskPilot Logo" className="w-8 h-8 rounded-lg shadow-sm" />
                        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                            TASKPILOTAI
                        </h1>
                    </div>
                    <div className="px-4 mb-4">
                        <WorkspaceSwitcher />
                    </div>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    {item.isExternal ? (
                                        <SidebarMenuButton
                                            onClick={() => window.open(item.url, "_blank")}
                                            className="hover:bg-slate-800 transition-colors"
                                        >
                                            <item.icon className="text-green-500" />
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                    ) : (
                                        <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                                            <Link to={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    )}
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-slate-800/50">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            onClick={logout}
                            className="w-full justify-start gap-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="font-medium">Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
