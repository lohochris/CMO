import { Card } from '../../app/components/ui/card';
import { Settings } from 'lucide-react';

export const Services = () => {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-[#ffd700] mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Services & Features
        </h2>
        <div className="space-y-4">
          <div className="bg-[#001a16] border-l-4 border-[#ffd700] p-4 hover:border-l-8 transition-all">
            <h3 className="text-[#ffd700] font-semibold mb-2">Member Registration</h3>
            <p className="text-gray-300 text-sm">
              New members can register online and receive official ID upon validation
            </p>
          </div>
          <div className="bg-[#001a16] border-l-4 border-[#ffd700] p-4 hover:border-l-8 transition-all">
            <h3 className="text-[#ffd700] font-semibold mb-2">Financial Tracking</h3>
            <p className="text-gray-300 text-sm">
              Real-time balance tracking and contribution history
            </p>
          </div>
          <div className="bg-[#001a16] border-l-4 border-[#ffd700] p-4 hover:border-l-8 transition-all">
            <h3 className="text-[#ffd700] font-semibold mb-2">Welfare Assistance</h3>
            <p className="text-gray-300 text-sm">
              Transparent ticket-based welfare support system
            </p>
          </div>
          <div className="bg-[#001a16] border-l-4 border-[#ffd700] p-4 hover:border-l-8 transition-all">
            <h3 className="text-[#ffd700] font-semibold mb-2">Bulk Processing</h3>
            <p className="text-gray-300 text-sm">
              CSV upload support for high-volume transaction ingestion
            </p>
          </div>
          <div className="bg-[#001a16] border-l-4 border-[#ffd700] p-4 hover:border-l-8 transition-all">
            <h3 className="text-[#ffd700] font-semibold mb-2">Secure Access</h3>
            <p className="text-gray-300 text-sm">
              Role-based security with departmental dashboards
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};