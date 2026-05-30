import { FileText } from 'lucide-react';

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
          <FileText className="text-primary w-8 h-8" />
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">PR ELECTRICALS</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Terms & Conditions — Internal Operations Portal</p>
          </div>
        </div>

        <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
          <p className="text-slate-500 italic">Last Updated: May 31, 2026</p>
          
          <p>
            Please read these Terms & Conditions ("Terms") carefully before accessing or using the PR Electricals survey tracking portal ("Portal"). By accessing this Portal, you agree to comply with these terms.
          </p>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">1. Authorized Use</h2>
          <p>
            This Portal is strictly for authorized personnel, surveyors, employees, administrators, and designated clients of PR Electricals. Any unauthorized access, misuse, or attempt to compromise system integrity is strictly prohibited.
          </p>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">2. User Responsibilities</h2>
          <p>
            You are responsible for keeping your login credentials confidential and secure. You agree not to share your account, password, or authentication token with any third party. You are responsible for all actions taken under your account.
          </p>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">3. Accuracy of Submissions</h2>
          <p>
            Surveyors and employees must provide complete and accurate information during pole and switch point entries. Location data (GPS latitude/longitude) and uploaded photo attachments must represent actual field conditions without tampering or falsification. Submitting fraudulent data may result in immediate suspension.
          </p>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">4. Account Suspension & Blocking</h2>
          <p>
            PR Electricals reserves the right to suspend or block user accounts immediately in the event of:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Breach of these Terms.</li>
            <li>Submission of fake or manipulated data.</li>
            <li>Unauthorized disclosure of project data.</li>
            <li>Inactivity or at the request of project administrators.</li>
          </ul>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">5. Data Ownership</h2>
          <p>
            All data collected, stored, and generated in this Portal remains the exclusive property of PR Electricals and its clients. You may not distribute, copy, or export data for personal use or any purpose outside authorized business operations.
          </p>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">6. Limitation of Liability</h2>
          <p>
            PR Electricals provides this platform on an "as-is" basis. We do not guarantee uninterrupted availability. We are not liable for any data loss, network delays, or disruptions to field operations caused by system outages or network issues.
          </p>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">7. Amendments</h2>
          <p>
            We reserve the right to modify these Terms at any time to align with regulatory or operational updates. Modifications take effect immediately upon being posted on the Portal.
          </p>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} PR Electricals. All rights reserved.</p>
          <button 
            onClick={() => window.close()} 
            className="text-primary hover:underline font-bold"
          >
            Close Tab
          </button>
        </div>
      </div>
    </div>
  );
}
