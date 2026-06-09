import NextAuth from 'next-auth';
import { authOptions, ensureAdminFlags } from '@/lib/auth';

const handler = NextAuth(authOptions);
// Asegura flags de admin en cada arranque
ensureAdminFlags().catch(() => {});

export { handler as GET, handler as POST };
