import { uploadProfilePhotoToStorage, supabase } from '../lib/supabaseClient';

export const uploadProfilePicture = async (memberId: string, file: Blob | string, fallbackUrl?: string) => {
  const url = await uploadProfilePhotoToStorage(memberId, file);
  const finalUrl = url || fallbackUrl;

  if (finalUrl) {
    try {
      // Direct library method chaining to avoid raw filter parameter concatenation
      const { error } = await supabase
        .from('members')
        .update({ avatar_url: finalUrl })
        .eq('official_member_id', memberId);
      
      if (error) {
        throw error;
      }
    } catch (e) {
      try {
        await supabase
          .from('members')
          .update({ avatar_url: finalUrl })
          .eq('official_member_id', memberId);
      } catch (err) {
        // Silent fallback
      }
    }
  }

  return finalUrl;
};
