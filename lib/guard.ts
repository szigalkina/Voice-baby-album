import { eq } from "drizzle-orm";
import { getUserId } from "./auth";
import { getDb } from "./db";
import { babies, babyMembers } from "./schema";

// Throw Response objects so route handlers can `catch` and return them.
export async function requireUser() {
  const userId = await getUserId();
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  return userId;
}

// The album belongs to the owner AND any invited member (the other parent).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBabyForUser(db: any, userId: string) {
  const [own] = await db.select().from(babies).where(eq(babies.userId, userId));
  if (own) return own;
  const rows = await db
    .select({ baby: babies })
    .from(babyMembers)
    .innerJoin(babies, eq(babyMembers.babyId, babies.id))
    .where(eq(babyMembers.userId, userId));
  return rows[0]?.baby ?? null;
}

export async function requireBaby() {
  const userId = await requireUser();
  const db = await getDb();
  const baby = await getBabyForUser(db, userId);
  if (!baby) throw new Response("No baby profile", { status: 404 });
  return { userId, baby, db };
}
