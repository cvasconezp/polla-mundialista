// Marca a un usuario como super admin (control absoluto). Uso: npm run superadmin
// El email se toma de SUPERADMIN_EMAIL o, por defecto, cvasconezp@gmail.com
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SUPERADMIN_EMAIL ?? 'cvasconezp@gmail.com').toLowerCase();
  const r = await prisma.user.updateMany({ where: { email }, data: { superAdmin: true, isAdmin: true } });
  console.log(`Super admin (${email}): ${r.count} usuario(s) actualizado(s).`);
  if (r.count === 0) console.log('Ojo: ese email aún no ha iniciado sesión, así que no existe en la base.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
