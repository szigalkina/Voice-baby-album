import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import AccountClient from "@/components/AccountClient";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const userId = await getUserId();
  if (!userId) redirect("/signin");
  return (
    <>
      <AccountClient />
      <Nav active="account" />
    </>
  );
}
