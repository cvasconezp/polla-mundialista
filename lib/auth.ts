import type { NextAuthOptions } from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        (session.user as any).isAdmin = (user as any).isAdmin ?? false;
        (session.user as any).hasPaid = (user as any).hasPaid ?? false;
        (session.user as any).championPick = (user as any).championPick ?? null;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};

/** Promueve a admin automáticamente a los emails de ADMIN_EMAILS (separados por coma). */
export async function ensureAdminFlags() {
  const emails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) return;
  await prisma.user.updateMany({ where: { email: { in: emails } }, data: { isAdmin: true } });
}
