// Mengimpor createClient dari library resmi Supabase SDK
import { createClient } from '@supabase/supabase-js'

// Mengambil URL proyek Supabase dari environment variables (.env) yang diatur di Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

// Mengambil Kunci Anonim (Public Anon Key) Supabase dari environment variables (.env)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Menginisialisasi dan mengekspor instansi client Supabase untuk digunakan di seluruh aplikasi
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
