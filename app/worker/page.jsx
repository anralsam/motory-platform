import { redirect } from 'next/navigation';

// Bare /worker → the login gate. The real surfaces are /worker/login and
// /worker/dashboard.
export default function WorkerIndex() {
  redirect('/worker/login');
}
