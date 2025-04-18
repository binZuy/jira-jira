import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { SupabaseClient, User } from '@supabase/supabase-js'
import type { Context, MiddlewareHandler } from 'hono'
import { setCookie } from 'hono/cookie'
import { SUPABASE_KEY, SUPABASE_URL } from '@/config'

declare module 'hono' {
  interface ContextVariableMap {
    supabase: SupabaseClient
    user: User | null
  }
}

export const getSupabase = (c: Context) => {
  return c.get('supabase')
}

type SupabaseEnv = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

// Helper function to validate and sanitize cookie options
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeCookieOptions = (options: any) => {
  // Check if the sameSite property is a boolean, and convert it to a valid string value
  if (options?.sameSite === false) {
    options.sameSite = 'None'; // Ensure 'None' is used for false value
  }

  // Ensure that sameSite is one of the valid values for the CookieOptions
  const validSameSiteValues = ['Strict', 'Lax', 'None', 'strict', 'lax', 'none'];
  if (options?.sameSite && !validSameSiteValues.includes(options.sameSite)) {
    throw new Error('Invalid sameSite value');
  }

  return options;
}

export const supabaseMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const supabaseUrl = SUPABASE_URL;
    const supabaseAnonKey = SUPABASE_KEY;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL missing!')
    }

    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY missing!')
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const cookies = parseCookieHeader(c.req.header('Cookie') ?? '')
          return cookies.map((cookie) => ({
            name: cookie.name,
            value: cookie.value || '', // Ensure value is always a string
          }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Sanitize the cookie options before setting the cookie
            const sanitizedOptions = sanitizeCookieOptions(options)
            // Ensure value is a string when setting cookies
            if (typeof value === 'string') {
              setCookie(c, name, value, sanitizedOptions)
            }
          })
        },
      },
    });

    const {
        data: { user },
      } = await supabase.auth.getUser();

    c.set('user', user);
    c.set('supabase', supabase)

    await next()
  }
}
