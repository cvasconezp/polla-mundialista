// Permisos granulares por administrador (los gestiona el super admin desde el panel).
export const PERMISSION_KEYS = ['payments', 'results', 'champion', 'deleteUsers'] as const;
export type PermKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermKey, string> = {
  payments: 'Pagos',
  results: 'Resultados',
  champion: 'Campeón',
  deleteUsers: 'Eliminar usuarios',
};

// Por defecto, un nuevo administrador recibe todos los accesos; el super admin los ajusta.
export const DEFAULT_PERMS: Record<PermKey, boolean> = {
  payments: true, results: true, champion: true, deleteUsers: true,
};

// ¿El usuario (de la sesión) puede ejecutar la acción `key`?
export function adminCan(user: any, key: PermKey): boolean {
  if (!user) return false;
  if (user.superAdmin) return true;       // super admin: todo
  if (!user.isAdmin) return false;         // jugador: nada de admin
  const p = user.permissions;
  if (p == null) return true;              // admin sin permisos explícitos = acceso completo (legado)
  return !!p[key];
}
