/* ============================================================================
 * VOLD MOTOR — Order Lifecycle (State Machine) + helpers
 * ----------------------------------------------------------------------------
 * Strict sequential states for a car's journey through the shop.
 *   pending → in_progress → ready → completed
 * ========================================================================== */
(function (root) {
  var STATUS = { PENDING: 'pending', IN_PROGRESS: 'in_progress', READY: 'ready', COMPLETED: 'completed' };
  var FLOW = ['pending', 'in_progress', 'ready', 'completed'];

  var META = {
    pending:     { ar: 'قيد الانتظار',       color: '#475569', bg: '#f1f5f9', accent: '#64748b', next: 'in_progress', actionAr: 'بدء العمل',   actionColor: '#16a34a' },
    in_progress: { ar: 'جاري العمل',          color: '#1d4ed8', bg: '#eff6ff', accent: '#2563eb', next: 'ready',       actionAr: 'إنهاء العمل', actionColor: '#2563eb' },
    ready:       { ar: 'جاهزة للاستلام',      color: '#b45309', bg: '#fffbeb', accent: '#d97706', next: 'completed',   actionAr: 'تم التسليم',  actionColor: '#0891b2' },
    completed:   { ar: 'مكتمل / تم التسليم',  color: '#15803d', bg: '#f0fdf4', accent: '#16a34a', next: null,          actionAr: '',            actionColor: '' },
  };

  /* timestamp column that should be set when moving INTO a status */
  var STAMP = { in_progress: 'started_at', ready: 'ready_at', completed: 'completed_at' };

  function nextOf(status) { var m = META[status]; return m ? m.next : null; }
  function isValid(status) { return FLOW.indexOf(status) !== -1; }

  /* "Time elapsed" tag — highlights delayed cars. */
  function elapsed(fromISO) {
    if (!fromISO) return { text: '—', late: false };
    var mins = Math.max(0, Math.floor((Date.now() - new Date(fromISO).getTime()) / 60000));
    var late = mins >= 45;                 // delayed threshold
    var text = mins < 60 ? (mins + ' د') : (Math.floor(mins / 60) + ' س ' + (mins % 60) + ' د');
    return { text: 'منذ ' + text, late: late, mins: mins };
  }

  /* ── Notification hook (PREPARATION) ──────────────────────────────────────
     Fires whenever an order is moved to READY or COMPLETED.
     Empty by design — wire WhatsApp / SMS here later. */
  function triggerCustomerNotification(orderId, newStatus) {
    if (newStatus !== STATUS.READY && newStatus !== STATUS.COMPLETED) return Promise.resolve({ skipped: true });
    try { console.log('[VM notify] order', orderId, '→', newStatus); } catch (e) {}
    // TODO: integrate WhatsApp/SMS provider. Keep returning a promise for async use.
    return Promise.resolve({ queued: true, orderId: orderId, status: newStatus });
  }

  root.VM_ORDER_STATUS = STATUS;
  root.VM_ORDER_FLOW = FLOW;
  root.VM_ORDER_META = META;
  root.VM_ORDER_STAMP = STAMP;
  root.vmOrderNext = nextOf;
  root.vmOrderValid = isValid;
  root.vmOrderElapsed = elapsed;
  root.triggerCustomerNotification = triggerCustomerNotification;

  if (typeof module !== 'undefined' && module.exports) module.exports = root;
})(typeof window !== 'undefined' ? window : globalThis);
