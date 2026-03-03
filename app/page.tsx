import { redirect } from "next/navigation";

// Root page redirects to dashboard; middleware handles auth
export default function Home() {
  redirect("/dashboard");
}
