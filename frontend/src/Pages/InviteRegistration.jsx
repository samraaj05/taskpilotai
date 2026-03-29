import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { base44, api } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Mail, Lock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function InviteRegistration() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { user, login } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [inviteData, setInviteData] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        const fetchInvite = async () => {
            try {
                setLoading(true);
                // Use the new public invite details endpoint
                const response = await api.get(`/api/invite/${token}`);
                setInviteData(response.data.data);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch invite:", err);
                setError(err.response?.data?.message || "Invalid or expired invitation link.");
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchInvite();
        }
    }, [token]);

    const handleRegisterAndJoin = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = { name, password, token };
            const response = await api.post('/api/invite/register', payload);
            
            const { user: userData, accessToken } = response.data;
            login(userData, accessToken);
            
            toast.success(`Welcome to TaskPilot, ${userData.name}!`);
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAcceptOnly = async () => {
        setSubmitting(true);
        try {
            await api.post('/api/invite/accept', { token });
            toast.success("Joined workspace successfully!");
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to join workspace.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <div className="text-center">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-violet-500" />
                    <p className="mt-4 text-slate-400 font-medium font-outfit">Validating your invitation...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
                <Card className="max-w-md w-full bg-slate-900/50 border-slate-800 backdrop-blur-xl">
                    <CardContent className="pt-10 pb-10 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-2 font-outfit">Invitation Error</h2>
                        <p className="text-slate-400 mb-8">{error}</p>
                        <Button
                            onClick={() => navigate("/login")}
                            className="w-full bg-violet-600 hover:bg-violet-700"
                        >
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Determine if the visitor is already the invited user
    const isAlreadyInvitedUser = user && user.email === inviteData?.email;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(124,58,237,0.15),transparent_60%)]" />
            
            <Card className="w-full max-w-lg bg-slate-900/50 border-slate-800 backdrop-blur-xl relative z-10 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600" />
                
                <CardHeader className="space-y-1 text-center pb-2 pt-8">
                    <div className="mx-auto w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-600/20 rotate-3">
                        <UserPlus className="w-8 h-8 text-white -rotate-3" />
                    </div>
                    <CardTitle className="text-3xl font-extrabold text-white font-outfit">
                        {isAlreadyInvitedUser ? "Join the Workspace" : "Welcome aboard!"}
                    </CardTitle>
                    <p className="text-slate-400">
                        You've been invited to join TaskPilotAI as a <span className="text-violet-400 font-semibold">{inviteData?.role}</span>
                    </p>
                </CardHeader>
                
                <CardContent className="pt-6">
                    {isAlreadyInvitedUser ? (
                        <div className="space-y-6 text-center">
                            <div className="p-6 rounded-2xl bg-violet-500/5 border border-violet-500/10">
                                <p className="text-slate-300">
                                    You are currently logged in as <span className="text-white font-medium">{user.email}</span>. 
                                    Click below to accept the invitation and join the workspace.
                                </p>
                            </div>
                            <Button 
                                onClick={handleAcceptOnly} 
                                disabled={submitting}
                                className="w-full bg-violet-600 hover:bg-violet-700 h-12 text-lg font-bold shadow-xl shadow-violet-600/20"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accept & Enter Workspace"}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleRegisterAndJoin} className="space-y-5">
                            <div className="grid grid-cols-1 gap-5">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-300 ml-1">Your Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <Input
                                            id="email"
                                            value={inviteData?.email}
                                            disabled
                                            className="bg-slate-800/20 border-slate-700 text-slate-400 pl-10 h-11"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 ml-1 uppercase tracking-wider">Invitation is tied to this address</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-300 ml-1">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <Input
                                            id="name"
                                            placeholder="Enter your name"
                                            className="bg-slate-800/50 border-slate-700 text-white pl-10 h-11 focus:ring-violet-500"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-300 ml-1">Choose Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="bg-slate-800/50 border-slate-700 text-white pl-10 h-11 focus:ring-violet-500"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <Button 
                                type="submit" 
                                className="w-full bg-violet-600 hover:bg-violet-700 h-12 text-lg font-bold shadow-xl shadow-violet-600/20 mt-4" 
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set Password & Join'}
                            </Button>
                        </form>
                    )}
                    
                    {!user && (
                        <div className="mt-8 text-center border-t border-slate-800 pt-6">
                            <span className="text-slate-500 text-sm">Already have an account with this email? </span>
                            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-bold ml-1 transition-colors">Sign In</Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
