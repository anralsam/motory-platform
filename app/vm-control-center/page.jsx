/**
 * DEPRECATED — the super-admin control room has been merged into /dashboard-pro
 * (Governance tab). This route now permanently redirects there so old links and
 * bookmarks keep working. Auth is still enforced by the global middleware.
 */
import { redirect } from 'next/navigation';

export default function VmControlCenterDeprecated() {
  redirect('/dashboard-pro');
}
