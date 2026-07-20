import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getUserId } from "./auth";
import { getDb } from "./db";
import { babies, babyMembers } from "./schema";

export const ALBUM_COOKIE = "vba_album";

// Throw Response objects so route handlers can `catch` and return them.
export async function requireUser() {
  const userId = await getUserId();
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  return userId;
}

// All albums this user can see: their own plus any they were invited into.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBabiesForUser(db: any, userId: string) {
  const own = await db
    .select()
    .from(babies)
    .where(eq(babies.userId, userId))
    .orderBy(asc(babies.createdAt), asc(babies.id));
  const member = await db
    .select({ baby: babies })
    .from(babyMembers)
    .innerJoin(babies, eq(babyMembers.babyId, babies.id))
    .where(eq(babyMembers.userId, userId));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = [...own, ...member.map((m: any) => m.baby)];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return all.filter((b: any, i: number) => all.findIndex((x: any) => x.id === b.id) === i);
}

// The album the user is currently working in: the one from the vba_album
// cookie when it's theirs, else their first album.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBabyForUser(db: any, userId: string) {
  const list = await getBabiesForUser(db, userId);
  if (!list.length) return null;
  const activeId = (await cookies()).get(ALBUM_COOKIE)?.value;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return list.find((b: any) => b.id === activeId) ?? list[0];
}

export async function requireBaby() {
  const userId = await requireUser();
  const db = await getDb();
  const baby = await getBabyForUser(db, userId);
  if (!baby) throw new Response("No baby profile", { status: 404 });
  return { userId, baby, db };
}
