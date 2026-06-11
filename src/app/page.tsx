import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const currentUser = cookieStore.get("refresh-token")?.value;

  if (currentUser) {
    redirect("/homepage");
  }

  redirect("/auth");
}
