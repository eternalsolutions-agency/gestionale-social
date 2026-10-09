import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkjajqizdjaynslvwcfp.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_VgyXCuW3mJtHi96I8Lo2gg_hvCEWbgh'

export const supabase = createClient(supabaseUrl, supabaseKey)
