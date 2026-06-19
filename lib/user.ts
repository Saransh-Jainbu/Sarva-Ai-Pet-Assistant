import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * The signed-in user's id, or null if not authenticated. Data routes must 401
 * when this is null so one user can never see another's data.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Loads the user and lazily creates their PetState on first sign-in. */
export async function getCurrentUser() {
  const id = await getCurrentUserId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { pet: true },
  });
  if (user && !user.pet) {
    await prisma.petState.create({ data: { userId: user.id } });
  }
  return user;
}
