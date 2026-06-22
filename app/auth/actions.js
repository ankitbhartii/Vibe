'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData) {
  const supabase = await createClient()
  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const { error } = await supabase.auth.signInWithPassword(data)
  
  // If error, send the exact Supabase error message to the login page
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`)

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}

export async function signup(formData) {
  const supabase = await createClient()
  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const { error } = await supabase.auth.signUp(data)
  
  // If error, send the exact Supabase error message to the signup page
  if (error) redirect(`/signup?message=${encodeURIComponent(error.message)}`)

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}