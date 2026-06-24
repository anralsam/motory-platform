// Normalizes the auth user's metadata role into one of: owner | manager | technician.
export function roleOf(metaRole) {
  const r = String(metaRole || '').toLowerCase();
  if (r === 'manager') return 'manager';
  if (r === 'technician' || r === 'worker' || r === 'tech') return 'technician';
  return 'owner'; // merchant / owner / pending / empty → owner
}

export function roleLabel(role) {
  return role === 'manager' ? 'مشرف' : role === 'technician' ? 'فني' : 'مالك';
}
