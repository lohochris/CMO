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

function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export const uploadProfilePhotoToStorage = async (memberId: string, file: Blob | string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or anon key is missing. Cannot upload profile photo.');
    return null;
  }

  let blob: Blob;
  if (typeof file === 'string') {
    if (file.startsWith('data:')) {
      blob = dataURLtoBlob(file);
    } else {
      const binary = atob(file);
      const array = [];
      for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
      }
      blob = new Blob([new Uint8Array(array)], { type: 'image/jpeg' });
    }
  } else {
    blob = file;
  }

  // Clean member ID to form a valid storage file path
  const cleanMemberId = (memberId || 'member').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanMemberId}.jpg`;
  const filePath = fileName;

  try {
    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, blob, { 
        contentType: 'image/jpeg', 
        upsert: true 
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('Failed to retrieve public URL from Supabase storage');
      return null;
    }

    return `${publicUrlData.publicUrl}?t=${Date.now()}`;
  } catch (catchErr) {
    console.error('Exception during Supabase storage upload:', catchErr);
    return null;
  }
};
