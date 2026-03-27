import emailjs from '@emailjs/browser';

// Initialize EmailJS with your public key
// Note: In production, you should set up proper EmailJS credentials
const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID_APPROVAL = 'YOUR_APPROVAL_TEMPLATE_ID';
const EMAILJS_TEMPLATE_ID_REJECTION = 'YOUR_REJECTION_TEMPLATE_ID';

// Initialize EmailJS (will work with demo credentials for now)
emailjs.init(EMAILJS_PUBLIC_KEY);

export interface ApplicationEmailData {
  applicantName: string;
  applicantEmail: string;
  memberNumber?: string;
  loginEmail?: string;
  loginPassword?: string;
  rejectionReason?: string;
}

export class EmailService {
  static async sendApprovalEmail(data: ApplicationEmailData): Promise<boolean> {
    try {
      // For demo purposes, we'll log the email instead of actually sending
      console.log('Sending approval email:', {
        to: data.applicantEmail,
        subject: 'Membership Application Approved',
        message: `
Dear ${data.applicantName},

Congratulations! Your membership application to OsuOlale Cooperative Society has been approved.

Your membership details:
- Member Number: ${data.memberNumber}
- Login Email: ${data.loginEmail}
- Temporary Password: ${data.loginPassword}

Please log in to your account at your earliest convenience to:
1. Change your password
2. Complete your profile
3. Start using our services

Welcome to the society!

Best regards,
The Society Admin Team
via Coopkonnect
        `
      });

      // In production, uncomment this to actually send emails:
      // const result = await emailjs.send(
      //   EMAILJS_SERVICE_ID,
      //   EMAILJS_TEMPLATE_ID_APPROVAL,
      //   {
      //     to_email: data.applicantEmail,
      //     to_name: data.applicantName,
      //     member_number: data.memberNumber,
      //     login_email: data.loginEmail,
      //     login_password: data.loginPassword,
      //   }
      // );

      return true;
    } catch (error) {
      console.error('Failed to send approval email:', error);
      return false;
    }
  }

  static async sendRejectionEmail(data: ApplicationEmailData): Promise<boolean> {
    try {
      // For demo purposes, we'll log the email instead of actually sending
      console.log('Sending rejection email:', {
        to: data.applicantEmail,
        subject: 'Membership Application Update',
        message: `
Dear ${data.applicantName},

Thank you for your interest.

After careful review, we regret to inform you that your membership application has not been approved at this time.

Reason: ${data.rejectionReason || 'Application did not meet current membership criteria.'}

You are welcome to reapply in the future. If you have any questions about this decision, please feel free to contact our administration team.

Thank you for your interest.

Best regards,
The Society Admin Team
via Coopkonnect
        `
      });

      // In production, uncomment this to actually send emails:
      // const result = await emailjs.send(
      //   EMAILJS_SERVICE_ID,
      //   EMAILJS_TEMPLATE_ID_REJECTION,
      //   {
      //     to_email: data.applicantEmail,
      //     to_name: data.applicantName,
      //     rejection_reason: data.rejectionReason,
      //   }
      // );

      return true;
    } catch (error) {
      console.error('Failed to send rejection email:', error);
      return false;
    }
  }
}
