import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { getWorkspaces } from "@/features/workspaces/queries";

export default async function Home() {
  const user = await getCurrent();

  if (!user) redirect("/sign-in");
  const workspaces = await getWorkspaces();
  if (!workspaces || workspaces.length === 0) {
    redirect("/workspaces/create");
  } else {
    redirect(`/workspaces/${workspaces[0].id}`);
  }
  // return <div className="bg-neutral-500 p-4 h-full">Home Page</div>;
        // "id": "c87cdbd6-dcea-4242-8fc2-5a8bc014fb57",
        // "aud": "authenticated",
        // "role": "authenticated",
        // "email": "duynguyenminh0206@gmail.com",
        // "email_confirmed_at": "2025-04-12T11:41:26.636447Z",
        // "phone": "",
        // "confirmed_at": "2025-04-12T11:41:26.636447Z",
        // "last_sign_in_at": "2025-04-12T19:55:16.969502Z",
        // "app_metadata": {
        //     "provider": "google",
        //     "providers": [
        //         "google"
        //     ]
        // },
        // "user_metadata": {
        //     "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJd09HUbp86NqKiNscp1EoF-Ald1ljvS_rSNvK8U3THufEHeA=s96-c",
        //     "email": "duynguyenminh0206@gmail.com",
        //     "email_verified": true,
        //     "full_name": "Duy Nguyễn",
        //     "iss": "https://accounts.google.com",
        //     "name": "Duy Nguyễn",
        //     "phone_verified": false,
        //     "picture": "https://lh3.googleusercontent.com/a/ACg8ocJd09HUbp86NqKiNscp1EoF-Ald1ljvS_rSNvK8U3THufEHeA=s96-c",
        //     "provider_id": "118118189882519699270",
        //     "sub": "118118189882519699270"
        // },
        // "identities": [
        //     {
        //         "identity_id": "c3715002-a2f7-4c5a-9a90-379684bb3d34",
        //         "id": "118118189882519699270",
        //         "user_id": "c87cdbd6-dcea-4242-8fc2-5a8bc014fb57",
        //         "identity_data": {
        //             "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJd09HUbp86NqKiNscp1EoF-Ald1ljvS_rSNvK8U3THufEHeA=s96-c",
        //             "email": "duynguyenminh0206@gmail.com",
        //             "email_verified": true,
        //             "full_name": "Duy Nguyễn",
        //             "iss": "https://accounts.google.com",
        //             "name": "Duy Nguyễn",
        //             "phone_verified": false,
        //             "picture": "https://lh3.googleusercontent.com/a/ACg8ocJd09HUbp86NqKiNscp1EoF-Ald1ljvS_rSNvK8U3THufEHeA=s96-c",
        //             "provider_id": "118118189882519699270",
        //             "sub": "118118189882519699270"
        //         },
        //         "provider": "google",
        //         "last_sign_in_at": "2025-04-12T11:41:26.630721Z",
        //         "created_at": "2025-04-12T11:41:26.630772Z",
        //         "updated_at": "2025-04-12T19:55:04.200845Z",
        //         "email": "duynguyenminh0206@gmail.com"
        //     }
        // ],
        // "created_at": "2025-04-12T11:41:26.617353Z",
        // "updated_at": "2025-04-12T19:55:16.972458Z",
        // "is_anonymous": false
}
