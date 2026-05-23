import { uploadProfilePhotoToStorage } from '../lib/supabaseClient';

export const uploadProfilePicture = async (memberId: string, file: Blob) => {
  const url = await uploadProfilePhotoToStorage(memberId, file);
  return url;
};
