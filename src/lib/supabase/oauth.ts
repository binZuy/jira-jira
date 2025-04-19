'use server'

import { Provider } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "./server"

const signInWith = (provider:  Provider) => async () => {
    const supabase = await createClient();

    // const auth_callback_url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
    // console.log("auth_callback_url", auth_callback_url);
    const getURL = () => {
        let url =
          process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
          process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
          'http://localhost:3000/'
        // Make sure to include `https://` when not localhost.
        url = url.startsWith('http') ? url : `https://${url}`
        // Make sure to include a trailing `/`.
        url = url.endsWith('/') ? url : `${url}/`
        return url
      }
      console.log("getURL", getURL())
    const { data, error } =
    await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${getURL()}auth/callback`,
        },
    });

    if (error) {
        console.error("Error signing in with OAuth:", error);
        throw error;
    }

    redirect(data.url);
}

export const signInWithGoogle = signInWith('google');