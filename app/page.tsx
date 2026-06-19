import { auth } from "@/auth";
import Landing from "@/components/Landing";
import Dashboard from "@/components/Dashboard";

export default async function Page() {
  const session = await auth();
  if (!session?.user) return <Landing />;
  return (
    <Dashboard
      user={{ name: session.user.name ?? "friend", image: session.user.image ?? null }}
    />
  );
}
