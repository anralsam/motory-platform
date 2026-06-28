'use client';

/**
 * WorkerModule — technician view. Purely task execution: the technician's
 * assigned tasks, each with the 3-stage toggle. Moving a task to "In Progress"
 * opens the start modal (plate + service + parts deduction). Inventory items of
 * the worker's center are passed down so the modal can list parts.
 */
import OrdersFlow from './OrdersFlow';

export default function WorkerModule({ orders = [], inventory = [] }) {
  return (
    <section>
      <h3 className="mb-3 text-base font-extrabold text-slate-900">مهامي النشطة</h3>
      <OrdersFlow orders={orders} inventory={inventory} />
    </section>
  );
}
