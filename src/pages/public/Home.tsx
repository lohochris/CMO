import { Card } from '../../app/components/ui/card';
import { Users, DollarSign, ClipboardCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export const Home = () => {
  const { setCurrentPage } = useApp();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-8 mb-6 md:mb-8">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-4">Welcome to Holy Cross CMO Portal</h2>
          <p className="text-gray-300 text-base md:text-lg mb-6">
            Digital Management System for Catholic Men Organization
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8">
            <div className="bg-[#001a16] border border-[#ffd700] p-4 md:p-6 rounded-lg hover:scale-105 transition-all">
              <Users className="w-10 md:w-12 h-10 md:h-12 text-[#ffd700] mx-auto mb-4" />
              <h3 className="text-[#ffd700] font-semibold mb-2">Member Management</h3>
              <p className="text-gray-400 text-sm">Track and manage all organization members</p>
            </div>
            <div className="bg-[#001a16] border border-[#ffd700] p-4 md:p-6 rounded-lg hover:scale-105 transition-all">
              <DollarSign className="w-10 md:w-12 h-10 md:h-12 text-[#ffd700] mx-auto mb-4" />
              <h3 className="text-[#ffd700] font-semibold mb-2">Financial Records</h3>
              <p className="text-gray-400 text-sm">Secure ledger and transaction tracking</p>
            </div>
            <div className="bg-[#001a16] border border-[#ffd700] p-4 md:p-6 rounded-lg hover:scale-105 transition-all">
              <ClipboardCheck className="w-10 md:w-12 h-10 md:h-12 text-[#ffd700] mx-auto mb-4" />
              <h3 className="text-[#ffd700] font-semibold mb-2">Digital Workflow</h3>
              <p className="text-gray-400 text-sm">Streamlined administrative processes</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Premium Family Entry Portals */}
      <div className="mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-[#ffd700] mb-6 flex items-center gap-2">
          <Users className="w-6 h-6" />
          CMO Family Units
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
          {(['Wisdom', 'Honour', 'Integrity', 'Talent'] as const).map((family) => {
            const borderColors = {
              Wisdom: 'border-blue-500/30 hover:border-blue-400 hover:shadow-blue-500/10',
              Honour: 'border-yellow-500/30 hover:border-yellow-400 hover:shadow-yellow-500/10',
              Integrity: 'border-green-500/30 hover:border-green-400 hover:shadow-green-500/10',
              Talent: 'border-purple-500/30 hover:border-purple-400 hover:shadow-purple-500/10'
            };
            const textColors = {
              Wisdom: 'text-blue-300',
              Honour: 'text-yellow-300',
              Integrity: 'text-green-300',
              Talent: 'text-purple-300'
            };
            const bgGradients = {
              Wisdom: 'bg-gradient-to-br from-[#002520] to-blue-950/20',
              Honour: 'bg-gradient-to-br from-[#002520] to-yellow-950/20',
              Integrity: 'bg-gradient-to-br from-[#002520] to-green-950/20',
              Talent: 'bg-gradient-to-br from-[#002520] to-purple-950/20'
            };
            const descriptions = {
              Wisdom: 'Focuses on stewardship, professional mentorship, and financial discipline across all family members.',
              Honour: 'Builds community trust, sets standards of honor, and provides exemplary leadership in active service.',
              Integrity: 'Champions clear financial accountability, full transparency, and strong family unit cohesion.',
              Talent: 'Activates fellowship, coordinates event support, and drives creative planning within the organization.'
            };
            return (
              <Card
                key={family}
                onClick={() => setCurrentPage(`family/${family.toLowerCase()}` as any)}
                className={`${bgGradients[family]} border-2 ${borderColors[family]} p-6 cursor-pointer transform hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`text-xl font-bold ${textColors[family]}`}>{family} Family</h4>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-[#ffd700]/20 text-[#ffd700]">
                    <span className="text-xs">➔</span>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  {descriptions[family]}
                </p>
                <span className="text-xs font-semibold text-[#ffd700] hover:underline flex items-center gap-1">
                  Enter Family Portal
                </span>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};