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
import { ShieldCheck, ShieldX, Shield } from 'lucide-react';

export default function ApplicationsPage() {
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
    loadApplications();
    loadMembers();
  }, []);

  const loadApplications = async () => {
    const allApplications = await db.getApplications();
    setApplications(allApplications);
  };

  const loadMembers = async () => {
    const allMembers = await db.getMembers();
    setMembers(allMembers);
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
    setSelectedApplication(application);
    setReviewNotes('');
    const reqs = await db.getGuarantorRequestsForApplication(application.id);
    setGuarantorRequests(reqs);
    setIsDialogOpen(true);
  };

  const handleApproveApplication = async () => {
    if (!selectedApplication) return;

    try {
      setError('');
      setSuccess('');

      // Update application status
      const updatedApplication = await db.updateApplication(selectedApplication.id, {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: 'admin',
        reviewNotes,
      });

      if (updatedApplication !== undefined) {
        // Create user account with default password and first login flag
        const user = await db.createUser({
          email: selectedApplication.email,
          password: 'member123', // Default password - user must change on first login
          role: 'member',
          isFirstLogin: true, // Flag to prompt password change on first login
        });

        // Generate member number
        const allMembers = await db.getMembers();
        const memberCount = allMembers.length;
        const memberNumber = `OSU${String(memberCount + 1).padStart(3, '0')}`;

        // Create member record
        const newMember = await db.createMember({
          userId: user.id,
          societyId: 'soc1',
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

        // Send approval email
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
      }
    } catch (err) {
      console.error('Error approving application:', err);
      setError('Failed to approve application. Please try again.');
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
                  <TableCell>{application.appliedAt.toLocaleDateString()}</TableCell>
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
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Review Membership Application</DialogTitle>
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
                    <p className="text-sm">{selectedApplication.appliedAt.toLocaleDateString()}</p>
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
                  {(selectedApplication.guarantor1Id || (selectedApplication.guarantorIds && selectedApplication.guarantorIds.length > 0)) ? (() => {
                    const gId = selectedApplication.guarantor1Id || selectedApplication.guarantorIds?.[0];
                    const guarantor = members.find(m => m.id === gId);
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
                          <div>
                            <Label className="text-xs">Email</Label>
                            <p className="break-all">{guarantor?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="p-3 border rounded-lg bg-blue-50">
                      <h4 className="font-medium text-blue-900 mb-2">Primary Guarantor (Legacy)</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <p>{(selectedApplication as any).guarantor1Name || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Member Number</Label>
                          <p>{(selectedApplication as any).guarantor1MemberNumber || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Secondary Guarantor */}
                  {(selectedApplication.guarantor2Id || (selectedApplication.guarantorIds && selectedApplication.guarantorIds.length > 1)) ? (() => {
                    const gId = selectedApplication.guarantor2Id || selectedApplication.guarantorIds?.[1];
                    const guarantor = members.find(m => m.id === gId);
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
                          <div>
                            <Label className="text-xs">Phone Number</Label>
                            <p>{guarantor?.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Email</Label>
                            <p className="break-all">{guarantor?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="p-3 border rounded-lg bg-green-50">
                      <h4 className="font-medium text-green-900 mb-2">Secondary Guarantor (Legacy)</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <p>{(selectedApplication as any).guarantor2Name || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Member Number</Label>
                          <p>{(selectedApplication as any).guarantor2MemberNumber || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Guarantor Status from Workflow */}
              {guarantorRequests.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-violet-600" /> Guarantor Approvals
                  </h3>
                  <div className="space-y-2">
                    {guarantorRequests.map(req => {
                      const gMember = members.find(m => m.id === req.guarantorMemberId);
                      return (
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-2">
                            {req.status === 'approved' ? <ShieldCheck className="h-4 w-4 text-green-600" /> :
                              req.status === 'declined' ? <ShieldX className="h-4 w-4 text-red-600" /> :
                                <Shield className="h-4 w-4 text-slate-400" />}
                            <span className="text-sm font-medium">
                              {gMember ? `${gMember.firstName} ${gMember.lastName} (${gMember.memberNumber})` : req.guarantorMemberId}
                            </span>
                          </div>
                          <Badge variant={req.status === 'approved' ? 'default' : req.status === 'declined' ? 'destructive' : 'secondary'}>
                            {req.status}
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
                      <p className="text-sm">{selectedApplication.reviewedAt?.toLocaleDateString()}</p>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
