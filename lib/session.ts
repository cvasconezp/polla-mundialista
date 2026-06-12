import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as { id: string; name?: string; email?: string; image?: string; isAdmin?: boolean; superAdmin?: boolean; hasPaid?: boolean; championPick?: string | null };
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new Response('No autenticado', { status: 401 });
  return u;
}

export async function requireAdmin() {
  const u = await currentUser();
  if (!u?.isAdmin) throw new Response('Solo administradores', { status: 403 });
  return u;
}

export async function requireSuperAdmin() {
  const u = await currentUser();
  if (!(u as any)?.superAdmin) throw new Response('Solo el super admin', { status: 403 });
  return u;
}
