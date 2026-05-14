import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://hogzfkngfnznelltksng.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pma25nZm56bmVsbHRrc25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzY5NzMsImV4cCI6MjA5NDMxMjk3M30.v6vEiBuDEeHS1L8GFW3k2P8gvR_3X_PchC8YiO4pjVI',
)
