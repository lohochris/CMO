import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or anon key is not configured. Profile picture uploads will fallback to local preview only.');
}

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

export const uploadProfilePhotoToStorage = async (memberId: string, file: Blob) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const fileName = `${memberId}-${Date.now()}.jpg`;
  const filePath = `profile-pictures/${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from('profile-pictures')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg'
    });

  if (uploadError) {
    console.error('Supabase storage upload failed:', uploadError.message);
    return null;
  }

  const { data: publicUrlData, error: publicUrlError } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(filePath);

  if (publicUrlError) {
    console.error('Supabase public URL retrieval failed:', publicUrlError.message);
    return null;
  }

  return publicUrlData.publicUrl;
};
