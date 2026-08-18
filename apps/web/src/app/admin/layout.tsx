import { AdminShell } from '@/components/admin/shell';

export const metadata = { robots: { index: false, follow: false }, title: 'Admin' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
