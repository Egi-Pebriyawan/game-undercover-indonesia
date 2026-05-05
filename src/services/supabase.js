import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hmtnyftykhegdjzipadh.supabase.co'
const supabaseAnonKey = 'sb_publishable_APEhW3PaPKfCHYiRzcX_rA_KKck07RG'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
