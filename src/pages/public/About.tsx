import { Card } from '../../app/components/ui/card';
import { Info } from 'lucide-react';

export const About = () => {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
          <Info className="w-6 h-6" />
          About Holy Cross CMO
        </h2>
        <div className="text-gray-300 space-y-4">
          <p>
            The Catholic Men Organization (CMO) of Holy Cross Parish, Badawa, is a dedicated
            community of Catholic men committed to spiritual growth, fellowship, and service
            under the Kano Diocese.
          </p>
          <p>
            This digital portal replaces traditional paper-based systems with a modern,
            secure platform for managing membership, financial contributions, and organizational
            activities.
          </p>
          <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded mt-6">
            <p className="text-[#ffd700] font-semibold mb-2">Our Motto:</p>
            <p className="text-lg md:text-xl italic">"Christ Is Our Leader"</p>
          </div>
        </div>
      </Card>
    </div>
  );
};