import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
// import { deleteCookie, setCookie } from "hono/cookie";

// import { createAdminClient } from "@/lib/appwrite";
// import { ID } from "node-appwrite";

import { loginSchema, registerSchema } from "../schemas";
// import { AUTH_COOKIE } from "../constants";
// import { sessionMiddleware } from "@/lib/session-middleware";
import { createClient } from "@/lib/supabase/server";
// import { middleware } from "@/middleware";

const app = new Hono()
  .get("/current", async (c) => {
    // const user = c.get("user");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return c.json({ data: user });
  })
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return c.json({ error: error.message }, 401);
    }
    // const { account } = await createAdminClient();
    // const session = await account.createEmailPasswordSession(email, password);

    // setCookie(c, AUTH_COOKIE, session.secret, {
    //   path: "/",
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: "strict",
    //   maxAge: 60 * 60 * 24 * 30,
    // });

    return c.json({ success: true });
  })

  .post("/register", zValidator("json", registerSchema), async (c) => {
    const { name, email, password } = c.req.valid("json");

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
        }
      }
    });
    if (error) {
      return c.json({ error: error.message }, 401);
    }
    // const { account } = await createAdminClient();
    // const user = await account.create(ID.unique(), email, password, name);

    // const session = await account.createEmailPasswordSession(email, password);

    // setCookie(c, AUTH_COOKIE, session.secret, {
    //   path: "/",
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: "strict",
    //   maxAge: 60 * 60 * 24 * 30,
    // });
    return c.json({ data: data.user, success: true });
  })

  .post("/logout", async (c) => {
    // // const account = c.get("account");

    // deleteCookie(c, AUTH_COOKIE);
    // await account.deleteSession("current");
    return c.json({ success: true });
  });
export default app;
