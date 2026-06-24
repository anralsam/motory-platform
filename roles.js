/* ============================================================================
 * VOLD MOTOR — Role-Based Access Control (RBAC): Single Source of Truth
 * ----------------------------------------------------------------------------
 * 3 logical roles. A TECHNICIAN must NEVER see financial data.
 *   OWNER       (المالك)        — full access (the center owner / merchant)
 *   MANAGER     (مشرف / كاشير)   — operations + customers, NO expenses page
 *   TECHNICIAN  (فني / عامل)     — task queue only, NO financials at all
 *
 * Declarative usage in HTML:
 *   <div data-role-deny="technician">…financial card…</div>
 *   <a   data-role-deny="technician manager" href="expenses.html">…</a>
 *   <div data-role-allow="owner">…owner-only…</div>
 * Then call: vmApplyRoleGuards(role)  (or vmGuardPage(sb) which does it all).
 * ========================================================================== */
(function (root) {
  var ROLES = { OWNER: 'owner', MANAGER: 'manager', TECHNICIAN: 'technician' };
  var LABELS = { owner: 'المالك', manager: 'مشرف / كاشير', technician: 'فني / عامل' };
  var LABELS_EN = { owner: 'Owner', manager: 'Manager / Cashier', technician: 'Technician' };

  /* Normalize any raw metadata role → one of the 3 logical roles. */
  function roleOf(metaRole) {
    var r = String(metaRole == null ? '' : metaRole).toLowerCase();
    if (r === 'manager') return ROLES.MANAGER;
    if (r === 'technician' || r === 'worker') return ROLES.TECHNICIAN;
    return ROLES.OWNER; // owner / merchant / admin / pending → owner-level dashboard
  }

  /* Resolve the current signed-in user's logical role. */
  function currentRole(sb) {
    return sb.auth.getSession()
      .then(function (r) { return roleOf(r && r.data && r.data.session && r.data.session.user && r.data.session.user.user_metadata && r.data.session.user.user_metadata.role); })
      .catch(function () { return ROLES.OWNER; });
  }

  function listOf(attr) { return String(attr || '').split(/[\s,]+/).filter(Boolean).map(function (x) { return x.toLowerCase(); }); }

  /* Hide/show elements declaratively based on the active role. */
  function applyRoleGuards(role) {
    document.querySelectorAll('[data-role-deny]').forEach(function (el) {
      if (listOf(el.getAttribute('data-role-deny')).indexOf(role) !== -1) el.style.display = 'none';
    });
    document.querySelectorAll('[data-role-allow]').forEach(function (el) {
      if (listOf(el.getAttribute('data-role-allow')).indexOf(role) === -1) el.style.display = 'none';
    });
    document.documentElement.setAttribute('data-vm-role', role);
  }

  /* Reusable page guard: optionally enforce allowed roles (else redirect). */
  function guardPage(sb, opts) {
    opts = opts || {};
    return currentRole(sb).then(function (role) {
      if (opts.allow && opts.allow.map(function (x) { return x.toLowerCase(); }).indexOf(role) === -1) {
        // Not allowed on this page → route to a safe landing for the role
        window.location.href = role === ROLES.TECHNICIAN ? 'worker.html' : (opts.fallback || 'dashboard.html');
        return role;
      }
      applyRoleGuards(role);
      return role;
    });
  }

  /* Where each role should land after login. */
  function landingFor(role) {
    return roleOf(role) === ROLES.TECHNICIAN ? 'worker.html' : 'dashboard.html';
  }

  root.VM_ROLES = ROLES;
  root.VM_ROLE_LABELS = LABELS;
  root.VM_ROLE_LABELS_EN = LABELS_EN;
  root.vmRoleOf = roleOf;
  root.vmCurrentRole = currentRole;
  root.vmApplyRoleGuards = applyRoleGuards;
  root.vmGuardPage = guardPage;
  root.vmLandingFor = landingFor;

  if (typeof module !== 'undefined' && module.exports) module.exports = root;
})(typeof window !== 'undefined' ? window : globalThis);
