'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/mock-data';
import { EmailService } from '@/lib/email-service';
import { MembershipApplication, GuarantorRequest } from '@/types';
import {
  Users, Search, UserCheck, UserX, Clock,
  CheckCircle2, XCircle, ChevronRight, FileText,
  AlertCircle, ShieldCheck, ShieldX, Shield, Mail, Phone, MapPin, Briefcase,
  DollarSign, Calendar, MessageSquare, Save, Trash2, Edit
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<MembershipApplication | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [guarantorRequests, setGuarantorRequests] = useState<GuarantorRequest[]>([]);

  useEffect(() => {
    console.log('AdminApplicationsPage: Auth user updated:', user?.email, 'Role:', user?.role, 'Society:', user?.societyId);
    if (user?.societyId || user?.role === 'super_admin') {
      loadApplications();
      loadMembers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedApplication) {
      console.log('Selected Application for Review:', {
        id: selectedApplication.id,
        name: `${selectedApplication.firstName} ${selectedApplication.lastName}`,
        status: selectedApplication.status,
        guarantorIds: selectedApplication.guarantorIds,
        appliedAt: selectedApplication.appliedAt
      });
    }
  }, [selectedApplication]);

  const loadApplications = async () => {
    try {
      if (user?.role === 'admin' && !user?.societyId) {
        console.warn('MembershipApplications: Society admin missing societyId');
        return;
      }
      
      const societyIdFilter = user?.role === 'super_admin' ? undefined : user?.societyId;
      const allApplications = await db.getApplications(societyIdFilter);
      setApplications(Array.isArray(allApplications) ? allApplications : []);
    } catch (err) {
      console.error('Error loading applications:', err);
      setError('Failed to load applications from database.');
    }
  };

  const loadMembers = async () => {
    try {
      const societyIdFilter = user?.role === 'super_admin' ? undefined : user?.societyId;
      
      if (!societyIdFilter && user?.role !== 'super_admin') return;
      
      const allMembers = await db.getMembers(societyIdFilter);
      setMembers(Array.isArray(allMembers) ? allMembers : []);
    } catch (err) {
      console.error('Error loading members for lookup:', err);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return d.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const filteredApplications = applications.filter(app =>
    app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewApplication = async (application: MembershipApplication) => {
    try {
      setSelectedApplication(application);
      setReviewNotes(application.reviewNotes || '');
      setError('');
      setSuccess('');
      
      const reqs = await db.getGuarantorRequestsForApplication(application.id);
      setGuarantorRequests(Array.isArray(reqs) ? reqs : []);
      setIsDialogOpen(true);
    } catch (err) {
      console.error('Failed to view application details:', err);
      setError('Could not load application details. Please try again.');
    }
  };

  const handleApproveApplication = async () => {
    if (!selectedApplication) return;

    try {
      setError('');
      setSuccess('');

      // Update application status
      console.log('Step 1: Updating application status to approved...', selectedApplication.id);
      const updatedApplication = await db.updateApplication(selectedApplication.id, {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: 'admin',
        reviewNotes,
      });

      if (!updatedApplication) {
        throw new Error('Could not update application status in database.');
      }

      // Use application's societyId, or fallback to the current admin's societyId
      const activeSocietyId = selectedApplication.societyId || user?.societyId || 'soc1';
      console.log('Step 2: Using activeSocietyId:', activeSocietyId);

      // Create or update user account
      console.log('Step 3: Creating/Updating user account for:', selectedApplication.email);
      let userAccount;
      try {
        userAccount = await db.createUser({
          email: selectedApplication.email,
          password: 'member123', // Default password - user must change on first login
          role: 'member',
          societyId: activeSocietyId,
          isFirstLogin: true, // Flag to prompt password change on first login
        });
        console.log('User account ready:', userAccount.id);
      } catch (userErr: any) {
        console.error('User creation/update failed:', userErr);
        throw new Error(`User Account Error: ${userErr.message}`);
      }

      // Generate member number globally unique across all societies
      console.log('Step 4: Generating member number...');
      const allMembers = await db.getMembers(); // Fetch all members globally
      
      // Find the highest numeric part of existing MEM-XXXXXX numbers
      let maxNumber = 0;
      allMembers.forEach(m => {
        if (m.memberNumber && m.memberNumber.startsWith('MEM-')) {
          const num = parseInt(m.memberNumber.replace('MEM-', ''), 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });
      
      const nextNumber = maxNumber + 1;
      const memberNumber = `MEM-${String(nextNumber).padStart(6, '0')}`;
      console.log('Generated Globally Unique Member Number:', memberNumber);

      // Create member record with correct societyId
      console.log('Step 5: Creating member record...');
      let newMember;
      try {
        newMember = await db.createMember({
          userId: userAccount.id,
          societyId: activeSocietyId,
          memberNumber,
          firstName: selectedApplication.firstName,
          lastName: selectedApplication.lastName,
          email: selectedApplication.email,
          phone: selectedApplication.phone,
          address: selectedApplication.address,
          status: 'active',
          sharesBalance: 0,
          savingsBalance: 0,
          loanBalance: 0,
          interestBalance: 0,
          societyDues: 0,
        });
        console.log('Member record created successfully:', newMember.id);
      } catch (memberErr: any) {
        console.error('Member record creation failed:', memberErr);
        throw new Error(`Member Record Error: ${memberErr.message}`);
      }

      // Send approval email
      console.log('Step 6: Sending notification email...');
      const emailSent = await EmailService.sendApprovalEmail({
        applicantName: `${selectedApplication.firstName} ${selectedApplication.lastName}`,
        applicantEmail: selectedApplication.email,
        memberNumber: newMember.memberNumber,
        loginEmail: selectedApplication.email,
        loginPassword: 'member123',
      });

      if (emailSent) {
        setSuccess('Application approved, member account created, and approval email sent');
      } else {
        setSuccess('Application approved and member account created (email notification failed)');
      }

      setIsDialogOpen(false);
      loadApplications();
    } catch (err: any) {
      console.error('FULL APPROVAL ERROR:', err);
      setError(err.message || 'Failed to approve application. Please try again.');
    }
  };

  const handleRejectApplication = async () => {
    if (!selectedApplication) return;

    try {
      setError('');
      setSuccess('');

      const updatedApplication = await db.updateApplication(selectedApplication.id, {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: 'admin',
        reviewNotes,
      });

      if (updatedApplication !== undefined) {
        // Send rejection email
        const emailSent = await EmailService.sendRejectionEmail({
          applicantName: `${selectedApplication.firstName} ${selectedApplication.lastName}`,
          applicantEmail: selectedApplication.email,
          rejectionReason: reviewNotes || 'Application did not meet current membership criteria.',
        });

        if (emailSent) {
          setSuccess('Application rejected and notification email sent');
        } else {
          setSuccess('Application rejected (email notification failed)');
        }

        setIsDialogOpen(false);
        loadApplications();
      }
    } catch (err) {
      console.error('Error rejecting application:', err);
      setError('Failed to reject application. Please try again.');
    }
  };

  const getStatusColor = (status: string): BadgeProps['variant'] => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Membership Applications</h2>
        <p className="text-muted-foreground">
          Review and approve membership applications
        </p>
      </div>

      {(error || success) && (
        <Alert variant={error ? "destructive" : "default"}>
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search applications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filteredApplications.length} application(s) found
        </span>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Applications List</CardTitle>
          <CardDescription>
            All membership applications awaiting review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Applied Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">
                    {application.firstName} {application.lastName}
                  </TableCell>
                  <TableCell>{application.email}</TableCell>
                  <TableCell>{application.phone}</TableCell>
                  <TableCell>{formatDate(application.appliedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewApplication(application)}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Application Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Membership Application Details</DialogTitle>
            <DialogDescription>
              Review applicant details and approve or reject the application
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Full Name</Label>
                    <p className="text-sm">{selectedApplication.firstName} {selectedApplication.lastName}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm">{selectedApplication.phone}</p>
                  </div>
                  <div>
                    <Label>Applied Date</Label>
                    <p className="text-sm">{formatDate(selectedApplication.appliedAt)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Address</Label>
                  <p className="text-sm">{selectedApplication.address}</p>
                </div>
              </div>

              {/* Guarantor Information */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Guarantor Information</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Primary Guarantor */}
                  {(() => {
                    try {
                      if (!(selectedApplication.guarantor1Id || (selectedApplication.guarantorIds && selectedApplication.guarantorIds.length > 0))) {
                        return (
                          <div className="p-3 border rounded-lg bg-blue-50">
                            <h4 className="font-medium text-blue-900 mb-2">Primary Guarantor (None)</h4>
                            <p className="text-xs text-slate-500">No guarantor information provided.</p>
                          </div>
                        );
                      }
                      
                      const gId = selectedApplication.guarantor1Id || selectedApplication.guarantorIds?.[0];
                      const guarantor = Array.isArray(members) ? members.find(m => m.id === gId) : null;
                      
                      return (
                        <div className="p-3 border rounded-lg bg-blue-50">
                          <h4 className="font-medium text-blue-900 mb-2">Primary Guarantor</h4>
                          <div className="space-y-1 text-sm">
                            <div>
                              <Label className="text-xs">Name</Label>
                              <p>{guarantor ? `${guarantor.firstName} ${guarantor.lastName}` : 'N/A'}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Member Number</Label>
                              <p>{guarantor?.memberNumber || 'N/A'}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Phone Number</Label>
                              <p>{guarantor?.phone || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    } catch (e) {
                      console.error('Crash in Primary Guarantor render:', e);
                      return <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-xs text-red-600">Error rendering guarantor info</div>;
                    }
                  })()}

                  {/* Secondary Guarantor */}
                  {(() => {
                    try {
                      if (!(selectedApplication.guarantor2Id || (selectedApplication.guarantorIds && selectedApplication.guarantorIds.length > 1))) {
                        return null; // Don't show if missing
                      }
                      
                      const gId = selectedApplication.guarantor2Id || selectedApplication.guarantorIds?.[1];
                      const guarantor = Array.isArray(members) ? members.find(m => m.id === gId) : null;
                      
                      return (
                        <div className="p-3 border rounded-lg bg-green-50">
                          <h4 className="font-medium text-green-900 mb-2">Secondary Guarantor</h4>
                          <div className="space-y-1 text-sm">
                            <div>
                              <Label className="text-xs">Name</Label>
                              <p>{guarantor ? `${guarantor.firstName} ${guarantor.lastName}` : 'N/A'}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Member Number</Label>
                              <p>{guarantor?.memberNumber || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    } catch (e) {
                      return <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-xs text-red-600">Error rendering secondary guarantor</div>;
                    }
                  })()}
                </div>
              </div>

              {/* Guarantor Status from Workflow */}
              {guarantorRequests.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-violet-600" /> Guarantor Approvals
                  </h3>
                  <div className="space-y-2">
                    {(Array.isArray(guarantorRequests) ? guarantorRequests : []).map(req => {
                      if (!req) return null;
                      const gMember = Array.isArray(members) ? members.find(m => m.id === req.guarantorMemberId) : null;
                      return (
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-2">
                            {req.status === 'approved' ? <ShieldCheck className="h-4 w-4 text-green-600" /> :
                              req.status === 'declined' ? <ShieldX className="h-4 w-4 text-red-600" /> :
                                <Shield className="h-4 w-4 text-slate-400" />}
                            <span className="text-sm font-medium">
                              {gMember ? `${gMember.firstName} ${gMember.lastName} (${gMember.memberNumber})` : (req.guarantorMemberId || 'Unknown')}
                            </span>
                          </div>
                          <Badge variant={req.status === 'approved' ? 'default' : req.status === 'declined' ? 'destructive' : 'secondary'}>
                            {req.status || 'pending'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  {guarantorRequests.some(r => r.status !== 'approved') && (
                    <Alert className="mt-3">
                      <ShieldX className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Approval blocked:</strong> All guarantors must approve before this application can be accepted.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Review Notes */}
              {selectedApplication.status === 'pending' && (
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
                    <Textarea
                      id="reviewNotes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add any notes about your decision..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Previous Review (if any) */}
              {selectedApplication.status !== 'pending' && selectedApplication.reviewNotes && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Review Details</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Reviewed By</Label>
                      <p className="text-sm">{selectedApplication.reviewedBy}</p>
                    </div>
                    <div>
                      <Label>Reviewed Date</Label>
                      <p className="text-sm">{formatDate(selectedApplication.reviewedAt)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Review Notes</Label>
                    <p className="text-sm">{selectedApplication.reviewNotes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedApplication.status === 'pending' && (() => {
                const allGuarantorsApproved = guarantorRequests.length === 0 || guarantorRequests.every(r => r.status === 'approved');
                return (
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    {!allGuarantorsApproved && (
                      <Alert variant="destructive">
                        <AlertDescription>Application cannot be approved until all guarantors have responded and approved.</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleRejectApplication}>Reject Application</Button>
                      <Button onClick={handleApproveApplication} disabled={!allGuarantorsApproved}>Approve &amp; Create Member</Button>
                    </div>
                  </div>
                );
              })()}

              {selectedApplication.status === 'approved' && !members.find(m => m.email === selectedApplication.email) && (
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 font-medium">
                      Member profile was not created or is out of sync. Click the button below to retry creation.
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handleApproveApplication}
                    >
                      Sync Member Profile
                    </Button>
                  </div>
                </div>
              )}

              {selectedApplication.status !== 'pending' && (selectedApplication.status !== 'approved' || members.find(m => m.email === selectedApplication.email)) && (
                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
