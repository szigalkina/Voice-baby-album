import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getBabyForUser } from "@/lib/guard";
import AlbumClient from "@/components/AlbumClient";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AlbumPage() {
  const userId = await getUserId();
  if (!userId) redirect("/signin");
  const db = await getDb();
  const baby = await getBabyForUser(db, userId);
  if (!baby) redirect("/onboarding");
  return (
    <>
      <AlbumClient baby={{ id: baby.id, name: baby.name, birthdate: baby.birthdate, title: baby.title }} />
      <Nav active="album" />
    </>
  );
}
