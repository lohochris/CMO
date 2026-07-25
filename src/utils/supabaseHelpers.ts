import { uploadProfilePhotoToStorage, supabase } from '../lib/supabaseClient';

/**
 * Checks if a string is a valid 36-character UUID.
 */
export const isUuid = (val: string | null | undefined): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
};

/**
 * Returns the appropriate database column field name to query ('id' vs 'official_member_id').
 * Prevents PostgreSQL error 22P02 (invalid input syntax for type uuid).
 */
export const getMemberQueryField = (memberId: string | null | undefined): 'id' | 'official_member_id' => {
  return isUuid(memberId) ? 'id' : 'official_member_id';
};

export const uploadProfilePicture = async (memberId: string, file: Blob | string, fallbackUrl?: string) => {
  const url = await uploadProfilePhotoToStorage(memberId, file);
  const finalUrl = url || fallbackUrl;

  if (finalUrl && memberId) {
    const queryField = getMemberQueryField(memberId);
    try {
      const { error } = await supabase
        .from('members')
        .update({ avatar_url: finalUrl })
        .eq(queryField, memberId);
      
      if (error) {
        throw error;
      }
    } catch (e) {
      try {
        await supabase
          .from('members')
          .update({ avatar_url: finalUrl })
          .eq(queryField, memberId);
      } catch (err) {
        // Silent fallback
      }
    }
  }

  return finalUrl;
};
