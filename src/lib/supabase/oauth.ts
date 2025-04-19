'use server'

import { Provider } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "./server"

const signInWith = (provider:  Provider) => async () => {
    const supabase = await createClient();

    const auth_callback_url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
    console.log("auth_callback_url", auth_callback_url);
    const { data, error } =
    await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: auth_callback_url,
        },
    });

    if (error) {
        console.error("Error signing in with OAuth:", error);
        throw error;
    }

    redirect(data.url);
}

export const signInWithGoogle = signInWith('google');