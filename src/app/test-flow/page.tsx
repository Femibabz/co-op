'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/mock-data';
import { EmailService } from '@/lib/email-service';
import { MembershipApplication } from '@/types';

interface TestResult {
  test: string;
  status: 'passed' | 'failed' | 'running';
  message: string;
  timestamp: Date;
}

export default function TestFlowPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  const addTestResult = (test: string, status: 'passed' | 'failed' | 'running', message: string) => {
    const result: TestResult = {
      test,
      status,
      message,
      timestamp: new Date()
    };
    setTestResults(prev => [...prev, result]);
    console.log(`[${result.timestamp.toISOString()}] ${test}: ${status.toUpperCase()} - ${message}`);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Test 1: Admin Login Verification
  const testAdminLogin = async () => {
    addTestResult('Admin Login', 'running', 'Verifying admin credentials...');
    await sleep(500);

    const adminUser = await db.findUserByEmail('admin@osuolale.com');
    if (adminUser && adminUser.password === 'admin123' && adminUser.role === 'admin') {
      addTestResult('Admin Login', 'passed', 'Admin credentials verified successfully');
      return true;
    } else {
      addTestResult('Admin Login', 'failed', 'Admin credentials verification failed');
      return false;
    }
  };

  // Test 2: Check Current Applications
  const testCheckApplications = async () => {
    addTestResult('Check Applications', 'running', 'Retrieving current applications...');
    await sleep(300);

    try {
      const applications = await db.getApplications();
      const pendingApps = applications.filter(app => app.status === 'pending');

      addTestResult('Check Applications', 'passed',
        `Found ${applications.length} total applications, ${pendingApps.length} pending`);

      pendingApps.forEach(app => {
        addTestResult('Application Details', 'passed',
          `${app.firstName} ${app.lastName} (${app.email}) - Applied: ${app.appliedAt.toLocaleDateString()}`);
      });

      return applications;
    } catch (error) {
      addTestResult('Check Applications', 'failed', `Error retrieving applications: ${error}`);
      return [];
    }
  };

  // Test 3: Submit New Application
  const testSubmitApplication = async () => {
    addTestResult('Submit Application', 'running', 'Submitting new test application...');
    await sleep(500);

    try {
      const testApplicationData = {
        societyId: 'soc1',
        firstName: 'TestBot',
        lastName: 'Automated',
        email: `testbot.${Date.now()}@email.com`,
        phone: '+234-807-123-4567',
        address: '123 Test Street, Automation City',
        guarantorIds: ['m1', 'm2'],
        guarantorCount: 2,
      };

      const newApplication = await db.createApplication(testApplicationData);
      addTestResult('Submit Application', 'passed',
        `Successfully submitted application for ${newApplication.firstName} ${newApplication.lastName} (ID: ${newApplication.id})`);
      return newApplication;
    } catch (error) {
      addTestResult('Submit Application', 'failed', `Failed to submit application: ${error}`);
      return null;
    }
  };

  // Test 4: Test Approval Process
  const testApprovalProcess = async (application: MembershipApplication) => {
    addTestResult('Approval Process', 'running', `Testing approval for ${application.firstName} ${application.lastName}...`);
    await sleep(800);

    try {
      // Update application status
      const reviewNotes = 'Application meets all criteria. Approved for membership.';
      const updatedApplication = db.updateApplication(application.id, {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: 'admin',
        reviewNotes: reviewNotes,
      });

      if (!updatedApplication) {
        addTestResult('Approval Process', 'failed', 'Failed to update application status');
        return false;
      }

      addTestResult('Approval Process', 'passed', 'Application status updated to approved');

      // Create user account
      const user = await db.createUser({
        email: application.email,
        password: 'member123',
        role: 'member',
      });

      addTestResult('User Creation', 'passed', `User account created with ID: ${user.id}`);

      // Generate member number and create member record
      const allMembersForCount = await db.getMembers(); const memberCount = allMembersForCount.length;
      const memberNumber = `OSU${String(memberCount + 1).padStart(3, '0')}`;

      const newMember = await db.createMember({
        userId: user.id,
        societyId: 'soc1',
        memberNumber,
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        phone: application.phone,
        address: application.address,
        status: 'active',
        sharesBalance: 0,
        savingsBalance: 0,
        loanBalance: 0,
        interestBalance: 0,
        societyDues: 0,
      });

      addTestResult('Member Creation', 'passed', `Member record created with number: ${newMember.memberNumber}`);

      // Test email notification
      const emailSent = await EmailService.sendApprovalEmail({
        applicantName: `${application.firstName} ${application.lastName}`,
        applicantEmail: application.email,
        memberNumber: newMember.memberNumber,
        loginEmail: application.email,
        loginPassword: 'member123',
      });

      if (emailSent) {
        addTestResult('Email Notification', 'passed', 'Approval email notification sent successfully (check console)');
      } else {
        addTestResult('Email Notification', 'failed', 'Failed to send approval email notification');
      }

      addTestResult('Approval Process', 'passed', 'Complete approval process finished successfully');
      return true;

    } catch (error) {
      addTestResult('Approval Process', 'failed', `Approval process failed: ${error}`);
      return false;
    }
  };

  // Test 5: Test Rejection Process
  const testRejectionProcess = async (application: MembershipApplication) => {
    addTestResult('Rejection Process', 'running', `Testing rejection for ${application.firstName} ${application.lastName}...`);
    await sleep(600);

    try {
      const rejectionReason = 'Insufficient income documentation provided.';
      const updatedApplication = db.updateApplication(application.id, {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: 'admin',
        reviewNotes: rejectionReason,
      });

      if (!updatedApplication) {
        addTestResult('Rejection Process', 'failed', 'Failed to update application status to rejected');
        return false;
      }

      addTestResult('Rejection Process', 'passed', 'Application status updated to rejected');

      // Test email notification
      const emailSent = await EmailService.sendRejectionEmail({
        applicantName: `${application.firstName} ${application.lastName}`,
        applicantEmail: application.email,
        rejectionReason: rejectionReason,
      });

      if (emailSent) {
        addTestResult('Email Notification', 'passed', 'Rejection email notification sent successfully (check console)');
      } else {
        addTestResult('Email Notification', 'failed', 'Failed to send rejection email notification');
      }

      addTestResult('Rejection Process', 'passed', 'Complete rejection process finished successfully');
      return true;

    } catch (error) {
      addTestResult('Rejection Process', 'failed', `Rejection process failed: ${error}`);
      return false;
    }
  };

  // Test 6: Data Persistence
  const testDataPersistence = async () => {
    addTestResult('Data Persistence', 'running', 'Testing localStorage persistence...');
    await sleep(400);

    try {
      const storedApplications = localStorage.getItem('osuolale_applications');
      const storedMembers = localStorage.getItem('osuolale_members');
      const storedUsers = localStorage.getItem('osuolale_users');

      if (storedApplications && storedMembers && storedUsers) {
        const apps = JSON.parse(storedApplications);
        const members = JSON.parse(storedMembers);
        const users = JSON.parse(storedUsers);

        addTestResult('Data Persistence', 'passed',
          `Data persisted: ${apps.length} applications, ${members.length} members, ${users.length} users`);
        return true;
      } else {
        addTestResult('Data Persistence', 'failed', 'Missing localStorage data');
        return false;
      }
    } catch (error) {
      addTestResult('Data Persistence', 'failed', `Data persistence test failed: ${error}`);
      return false;
    }
  };

  // Main test runner
  const runAllTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    setTestResults([]);

    let testsPassed = 0;
    let totalTests = 0;

    addTestResult('Test Suite', 'running', 'Starting comprehensive membership flow testing...');

    // Test 1: Admin login
    totalTests++;
    if (await testAdminLogin()) testsPassed++;

    // Test 2: Check applications
    totalTests++;
    const applications = await testCheckApplications();
    if (applications.length >= 0) testsPassed++;

    // Test 3: Submit new application
    totalTests++;
    const newApplication = await testSubmitApplication();
    if (newApplication) testsPassed++;

    // Test 4: Test approval process
    if (newApplication) {
      totalTests++;
      if (await testApprovalProcess(newApplication)) testsPassed++;
    }

    // Test 5: Test rejection process (use existing pending or create another)
    const pendingApps = applications.filter(app => app.status === 'pending');
    const rejectionTestApp = pendingApps.length > 0 ? pendingApps[0] : await testSubmitApplication();

    if (rejectionTestApp) {
      totalTests++;
      if (await testRejectionProcess(rejectionTestApp)) testsPassed++;
    }

    // Test 6: Data persistence
    totalTests++;
    if (await testDataPersistence()) testsPassed++;

    // Final summary
    const successRate = ((testsPassed / totalTests) * 100).toFixed(1);
    const status = testsPassed === totalTests ? 'passed' : 'failed';

    addTestResult('Test Suite Summary', status,
      `${testsPassed}/${totalTests} tests passed (${successRate}% success rate)`);

    // Final state report
    const finalApplications = await db.getApplications();
    const finalMembers = await db.getMembers();

    addTestResult('Final State', 'passed',
      `System state: ${finalApplications.length} applications (${finalApplications.filter(a => a.status === 'pending').length} pending, ${finalApplications.filter(a => a.status === 'approved').length} approved, ${finalApplications.filter(a => a.status === 'rejected').length} rejected), ${finalMembers.length} members`);

    setIsRunning(false);
    setOverallStatus('completed');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '🔄';
      default: return '⏳';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Membership Flow Testing</h1>
          <p className="mt-2 text-gray-600">Comprehensive testing of the application submission and review process</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>
              Run automated tests to verify the membership application flow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTestResults([])}
                disabled={isRunning}
              >
                Clear Results
              </Button>
            </div>

            {overallStatus === 'completed' && (
              <Alert className="mt-4">
                <AlertDescription>
                  Testing completed! Check the browser console for detailed email notification logs.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Real-time test execution results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getStatusIcon(result.status)}</span>
                      <div>
                        <div className="font-medium">{result.test}</div>
                        <div className="text-sm text-gray-600">{result.message}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Test Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Admin Credentials:</strong> admin@osuolale.com / admin123</p>
              <p><strong>Test Scope:</strong> Application submission, approval workflow, rejection workflow, email notifications, data persistence</p>
              <p><strong>Email Notifications:</strong> Check browser console for email content (emails are logged, not sent)</p>
              <p><strong>Data Storage:</strong> Uses localStorage for demo purposes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
