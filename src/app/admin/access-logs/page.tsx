'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/mock-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { LoginSession } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function AccessLogsPage() {
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [filter, setFilter] = useState<'all' | 'admin' | 'suspicious'>('admin');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user?.societyId]);

  const loadSessions = async () => {
    let loadedSessions: LoginSession[] = [];
    const societyId = user?.societyId;

    if (filter === 'admin') {
      loadedSessions = await db.getAdminLoginSessions(societyId);
    } else if (filter === 'suspicious') {
      const all = await db.getLoginSessions(societyId);
      loadedSessions = all.filter(s => s.isSuspicious);
    } else {
      loadedSessions = await db.getLoginSessions(societyId);
    }

    setSessions(loadedSessions);
  };

  const cleanupMemberSessions = async () => {
    setIsCleaningUp(true);
    setCleanupMessage(null);

    try {
      let deletedCount = 0;

      // Clean up from Supabase if configured
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('login_sessions')
          .delete()
          .eq('user_role', 'member')
          .select();

        if (error) {
          console.error('Supabase cleanup error:', error);
          throw error;
        }

        deletedCount = data?.length || 0;
      }

      // Clean up from localStorage
      const allSessions = await db.getLoginSessions(user?.societyId);
      const memberSessions = allSessions.filter(s => s.userRole === 'member');

      // Remove member sessions from localStorage
      memberSessions.forEach(session => {
        const stored = localStorage.getItem('coopkonnect_login_sessions');
        const sessions = JSON.parse(stored || '[]');
        const filtered = sessions.filter((s: any) => s.userRole !== 'member');
        localStorage.setItem('coopkonnect_login_sessions', JSON.stringify(filtered));
      });

      setCleanupMessage({
        type: 'success',
        text: `Successfully cleaned up ${deletedCount + memberSessions.length} member session(s) from database and storage.`
      });

      // Reload sessions
      loadSessions();
    } catch (error) {
      console.error('Error cleaning up member sessions:', error);
      setCleanupMessage({
        type: 'error',
        text: 'Failed to clean up member sessions. Please try again.'
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'desktop':
        return '💻';
      default:
        return '🖥️';
    }
  };

  const suspiciousCount = sessions.filter(s => s.isSuspicious).length;
  const activeCount = sessions.filter(s => s.sessionActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Access Logs</h2>
        <p className="text-muted-foreground">
          Track device and location information for admin logins (member sessions are not tracked)
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertDescription>
          ℹ️ For privacy and performance reasons, login sessions are only tracked for admin users. Regular member logins are not recorded in this log.
        </AlertDescription>
      </Alert>

      {/* Cleanup Alert */}
      {cleanupMessage && (
        <Alert variant={cleanupMessage.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{cleanupMessage.text}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">All login sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Currently logged in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{suspiciousCount}</div>
            <p className="text-xs text-muted-foreground">Flagged for review</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Cleanup</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={cleanupMemberSessions}
              disabled={isCleaningUp}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isCleaningUp ? 'Cleaning...' : 'Remove Member Sessions'}
            </Button>
            <p className="text-xs text-orange-600 mt-2">
              Delete old member sessions from database
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Sessions</CardTitle>
          <CardDescription>View different types of login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('admin')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'admin'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              Admin Only
            </button>
            <button
              onClick={() => setFilter('suspicious')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'suspicious'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              Suspicious Only
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              All Sessions
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Login Sessions</CardTitle>
          <CardDescription>
            Detailed information about each login session
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sessions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className={session.isSuspicious ? 'bg-orange-50' : ''}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{formatDate(session.loginTime)}</span>
                          {session.logoutTime && (
                            <span className="text-xs text-muted-foreground">
                              Logout: {formatDate(session.logoutTime)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{session.userEmail}</span>
                          <Badge variant={session.userRole === 'admin' ? 'default' : 'secondary'} className="w-fit">
                            {session.userRole}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span>{getDeviceIcon(session.deviceInfo.deviceType)}</span>
                            <span className="text-sm">{session.deviceInfo.deviceType}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {session.deviceInfo.browser} on {session.deviceInfo.os}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {session.deviceInfo.screenResolution}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {session.locationInfo.city && (
                            <span className="text-sm font-medium">
                              {session.locationInfo.city}, {session.locationInfo.country}
                            </span>
                          )}
                          {session.locationInfo.region && (
                            <span className="text-xs text-muted-foreground">
                              {session.locationInfo.region}
                            </span>
                          )}
                          {session.locationInfo.timezone && (
                            <span className="text-xs text-muted-foreground">
                              {session.locationInfo.timezone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{session.locationInfo.ip}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {session.sessionActive ? (
                            <Badge variant="default" className="bg-green-600 w-fit">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="w-fit">Ended</Badge>
                          )}
                          {session.isSuspicious && (
                            <Alert className="mt-2 border-orange-200 bg-orange-50">
                              <AlertDescription className="text-xs">
                                <strong>Suspicious:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {session.suspiciousReasons?.map((reason, idx) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
