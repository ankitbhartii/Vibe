'use server'

import { createClient } from '@/utils/supabase/server' // 👈 MAKE SURE THIS POINTS TO SERVER
import { redirect } from 'next/navigation'

export async function login(formData) {
  // 1. Initialize the server-side Supabase client correctly
  const supabase = await createClient() 

  // 2. Extract your form values safely
  const email = formData.get('email')
  const password = formData.get('password')

  // 3. Attempt login
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?message=Could not authenticate user')
  }

  // If successful, send them to the dashboard
  return redirect('/dashboard')
}