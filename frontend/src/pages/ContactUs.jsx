import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContactUs() {
  const navigate = useNavigate();

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      window.close();
      setTimeout(() => {
        navigate('/');
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-8 pb-6 border-b border-slate-100 text-center">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">PR ELECTRICALS</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Support & Operations Contact</p>
        </div>

        <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
          <p className="text-center text-slate-500 mb-6">
            If you encounter issues with logging in, submitting surveys, GPS capturing, or account permissions, please contact our support desk:
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <Mail className="text-primary w-5 h-5 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900">Email Support</h4>
                <p className="text-slate-600 mt-0.5">prelectricals01@gmail.com</p>
                <p className="text-xs text-slate-400 mt-1">Response time: Within 5 business days</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <Phone className="text-primary w-5 h-5 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900">Phone Support</h4>
                <p className="text-slate-600 mt-0.5">+91 87226 17252</p>
                <p className="text-xs text-slate-400 mt-1">Available: 9:00 AM - 6:00 PM (Mon-Sat)</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <MapPin className="text-primary w-5 h-5 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900">Registered Address</h4>
                <p className="text-slate-600 mt-0.5">
                  PR Electricals Ltd,<br />
                  NO# 304 13 TH CROSS,GOVINDRAJ NAGARA ,VIJAY NAGAR,
                  BANGLORE, PIN - 560040,
                  Karnataka, India
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} PR Electricals. All rights reserved.</p>
          <button 
            onClick={handleClose} 
            className="text-primary hover:underline font-bold text-sm"
          >
            Close Page
          </button>
        </div>
      </div>
    </div>
  );
}
