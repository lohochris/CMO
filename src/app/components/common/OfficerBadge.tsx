import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface OfficerBadgeProps {
  officeId?: string;
}

export const OfficerBadge: React.FC<OfficerBadgeProps> = ({ officeId = 'HCC-CMO-EXEC-FS' }) => {
  const [displayName, setDisplayName] = useState<string>('Loading...');
  const [initials, setInitials] = useState<string>('HC');

  useEffect(() => {
    async function loadOfficerName() {
      try {
        const { data, error } = await supabase
          .from('v_executive_profiles')
          .select('display_name')
          .eq('office_id', officeId)
          .maybeSingle();

        if (!error && data && data.display_name) {
          const name = data.display_name;
          setDisplayName(name);

          // Generate Initials
          const parts = name.trim().split(' ').filter(Boolean);
          const computedInitials = parts.length >= 2 
            ? `${parts[0][0]}${parts[1][0]}` 
            : name.slice(0, 2);
            
          setInitials(computedInitials.toUpperCase());
        }
      } catch (err) {
        console.error("Error loading officer name from view:", err);
      }
    }

    loadOfficerName();
  }, [officeId]);

  return (
    <div className="flex items-center gap-4 bg-[#05281e] p-4 rounded-xl text-white">
      <div className="w-20 h-20 rounded-full border-2 border-yellow-400 flex items-center justify-center text-yellow-400 text-2xl font-bold bg-[#031d16]">
        {initials}
      </div>
      <div className="bg-[#031d16] px-4 py-3 rounded-lg border border-gray-800 flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">NAME</p>
        <h3 className="text-lg font-bold text-white tracking-wide">{displayName}</h3>
      </div>
    </div>
  );
};
