/**
 * AdminDashboard – hlavní stránka pro administrátory.
 * Zobrazuje sekce: uživatelé, statistiky, logy. Přístup pouze pro adminy.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import { showSuccess, showError, showInfo } from '../components/toast';

interface User {
  id: string;
  email: string;
  displayName?: string;
  role?: string;
  createdAt?: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<{ users: number; lists: number; items: number }>({ users: 0, lists: 0, items: 0 });
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getSession();
      const role = data.session?.user.user_metadata?.role;
      if (role !== 'admin') {
        router.replace('/');
        return;
      }
      setIsAdmin(true);
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    // Načti uživatele
    fetchUsers();
    // Načti statistiky
    fetchStats();
  }, [isAdmin]);

  const fetchUsers = async () => {
    type RawUser = {
      id: string;
      email: string;
      raw_user_meta_data?: { displayName?: string; role?: string };
      created_at?: string;
    };
    const { data, error } = await supabase.rpc('get_all_users_with_metadata');
    if (!error && data) {
      setUsers((data as RawUser[]).map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.raw_user_meta_data?.displayName,
        role: u.raw_user_meta_data?.role,
        createdAt: u.created_at
      })));
    }
  };

  const fetchStats = async () => {
    const { data: userCount } = await supabase.from('auth.users').select('id', { count: 'exact', head: true });
    const { data: listCount } = await supabase.from('shopping_lists').select('id', { count: 'exact', head: true });
    const { data: itemCount } = await supabase.from('shopping_list_items').select('id', { count: 'exact', head: true });
    setStats({
      users: userCount?.length ?? 0,
      lists: listCount?.length ?? 0,
      items: itemCount?.length ?? 0
    });
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Opravdu smazat uživatele ${email}?`)) return;
    const { error } = await supabase.rpc('delete_user_by_id', { uid: id });
    if (error) showError('Chyba při mazání: ' + error.message);
    else {
      showSuccess('Uživatel smazán.');
      fetchUsers();
    }
  };

  const handleChangeRole = async (id: string, email: string) => {
    const newRole = window.prompt(`Zadejte novou roli pro ${email} (user/admin):`, 'user');
    if (!newRole) return;
    const { error } = await supabase.rpc('set_user_role', { uid: id, new_role: newRole });
    if (error) showError('Chyba při změně role: ' + error.message);
    else {
      showSuccess('Role změněna.');
      fetchUsers();
    }
  };

  const handleResetPassword = async (email: string) => {
    // Supabase nemá přímo admin reset, ale lze vygenerovat odkaz přes Auth API nebo poslat email uživateli
    showInfo('Pro reset hesla použijte funkci "Zapomenuté heslo" na přihlašovací stránce.');
  };

  if (loading) return <main className="p-8">Načítám…</main>;

  return (
    <main className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-red-400">Admin Dashboard</h1>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Statistiky</h2>
        <div className="flex gap-8 mb-2">
          <div>Uživatelé: <b>{stats.users}</b></div>
          <div>Seznamy: <b>{stats.lists}</b></div>
          <div>Položky: <b>{stats.items}</b></div>
        </div>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Uživatelé</h2>
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-zinc-800">
              <th className="p-2">Email</th>
              <th className="p-2">Jméno</th>
              <th className="p-2">Role</th>
              <th className="p-2">Vytvořen</th>
              <th className="p-2">Akce</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-zinc-700">
                <td className="p-2 font-mono">{u.email}</td>
                <td className="p-2">{u.displayName || <span className="italic text-zinc-500">—</span>}</td>
                <td className="p-2">{u.role || 'user'}</td>
                <td className="p-2">{u.createdAt ? new Date(u.createdAt).toLocaleString() : ''}</td>
                <td className="p-2 flex gap-2">
                  <button className="text-xs text-red-500 hover:underline" onClick={() => handleDeleteUser(u.id, u.email)}>Smazat</button>
                  <button className="text-xs text-blue-500 hover:underline" onClick={() => handleResetPassword(u.email)}>Reset hesla</button>
                  <button className="text-xs text-yellow-500 hover:underline" onClick={() => handleChangeRole(u.id, u.email)}>Změnit roli</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Logy (TODO)</h2>
        <div className="text-zinc-400">Zde budou logy akcí (registrace, mazání, změny rolí, ...)</div>
      </section>
    </main>
  );
} 