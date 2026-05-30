import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
          <ShieldCheck className="text-primary w-8 h-8" />
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">PR ELECTRICALS</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Privacy Policy — Internal Operations Portal</p>
          </div>
        </div>

        <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
          <p className="text-slate-500 italic">Last Updated: May 31, 2026</p>
          
          <p>
            PR ELECTRICALS ("we", "our", or "us") operates the internal survey management tracking platform. This Privacy Policy outlines our practices regarding the collection, use, and disclosure of information for all users of this system, including surveyors, employees, administrators, and clients.
          </p>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">1. Information We Collect</h2>
          <p>
            To facilitate field operations and project reporting, we collect and manage the following categories of data:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>User Account Information:</strong> Full name, professional email address, phone number, and password (securely hashed).</li>
            <li><strong>Role and Permission Management:</strong> System role (e.g., ADMIN, EMPLOYEE, MOBILE_USER), specific screen access permissions, and scopes (districts/ulb/wards).</li>
            <li><strong>Project Assignments:</strong> Links between user accounts and active infrastructure projects.</li>
            <li><strong>GPS/Location Data:</strong> Geolocation coordinates (latitude and longitude) captured at the time of field survey submissions. Location services are mandatory to record the accurate position of electrical poles and switch points.</li>
            <li><strong>Infrastructure Survey Records:</strong> Technical data related to assets (poles, switch points, meters, arms, lighting specifications, and electrical wire types).</li>
            <li><strong>Uploaded Assets:</strong> Photos and attachments of assets captured by surveyors for quality assurance.</li>
            <li><strong>Audit Logs:</strong> Operational tracking logs of user activity (creation, modification, and confirmation of records).</li>
          </ul>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">2. How We Use Your Information</h2>
          <p>
            We process collected information strictly for business, operational, and auditing purposes:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Facilitating field survey submissions and validation by administrators.</li>
            <li>Tracking employee field operations and verifying coordinates.</li>
            <li>Generating reports, summaries, and Excel data sheets for clients.</li>
            <li>Auditing user activity and preventing unauthorized access or data tampering.</li>
            <li>Maintaining account security and verifying identity during login.</li>
          </ul>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">3. Data Retention & Access Control</h2>
          <p>
            Survey records, images, reports, and operational data may be retained for as long as reasonably necessary to support project operations, maintenance activities, auditing requirements, legal obligations, historical reporting, and business continuity. User account credentials can be modified or disabled by platform administrators.
          </p>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">4. Data Security</h2>
          <p>
            We implement security measures designed to protect your data from unauthorized access, loss, or disclosure. Hashed credentials.
          </p>

          <h2 className="text-lg font-bold text-slate-950 pt-2 border-b border-slate-50 pb-1">5. Contact Information</h2>
          <p>
            If you have questions regarding this policy or data safety on this platform, please reach out via the contact information on the Contact page or speak to your system administrator.
          </p>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} PR ELECTRICALS. All rights reserved.</p>
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
