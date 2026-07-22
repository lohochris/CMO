import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface ExecutiveProfileBadgeProps {
  officeId?: string;
}

export const ExecutiveProfileBadge: React.FC<ExecutiveProfileBadgeProps> = ({ officeId = 'HCC-CMO-EXEC-FS' }) => {
  const [officerName, setOfficerName] = useState<string>('Loading...');
  const [officerInitials, setOfficerInitials] = useState<string>('HC');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedOfficer = async (officeId: string) => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v_executive_profiles')
          .select('display_name')
          .eq('office_id', officeId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching officer name:", error);
          setOfficerName('');
          setOfficerInitials('');
          return;
        }

        if (data && data.display_name) {
          const fullName = data.display_name; // "LOHO CHRISTOPHER DONDO"
          
          // Calculate initials
          const parts = fullName.trim().split(' ').filter(Boolean);
          const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : fullName.slice(0, 2);

          // Update state
          setOfficerName(fullName);
          setOfficerInitials(initials.toUpperCase());
        } else {
          setOfficerName('');
          setOfficerInitials('');
        }
      } catch (err) {
        console.error("Error loading assigned officer:", err);
        setOfficerName('');
        setOfficerInitials('');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedOfficer(officeId);
  }, [officeId]);

  return (
    <div className="flex items-center gap-4 bg-[#05281e] p-4 rounded-xl text-white">
      {/* Dynamic Avatar Initials */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-2 border-yellow-400 flex items-center justify-center text-yellow-400 text-2xl font-bold bg-[#031d16]">
          {loading ? '...' : officerInitials || 'HC'}
        </div>
        <span className="text-xs text-gray-400 text-center block mt-1">Click photo to change</span>
      </div>

      {/* Dynamic Member Name */}
      <div className="bg-[#031d16] px-4 py-3 rounded-lg border border-gray-800 flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">NAME</p>
        <h3 className="text-lg font-bold text-white tracking-wide">
          {loading ? 'Loading...' : officerName || officeId}
        </h3>
      </div>
    </div>
  );
};
