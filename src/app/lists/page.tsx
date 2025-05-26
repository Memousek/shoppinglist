/**
 * Stránka s přehledem nákupních seznamů uživatele.
 * Umožňuje zobrazit, přidat a odhlásit se.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import SkeletonList from '../components/skeletonList';
import { showSuccess, showError } from '../components/toast';

type ShoppingList = {
  id: string;
  name: string;
  note: string | null;
  created_at: string;
};

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const getSessionAndLists = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (!data.session) {
        router.push('/');
        return;
      }
      setLoading(true);
      // Seznamy, kde je owner
      const { data: ownedLists } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('owner_id', data.session.user.id)
        .order('created_at', { ascending: false });
      // Seznamy, kde accepted_by
      const { data: sharedRefs } = await supabase
        .from('shopping_list_shares')
        .select('list_id')
        .eq('accepted_by', data.session.user.id);
      let sharedLists: ShoppingList[] = [];
      if (sharedRefs && sharedRefs.length > 0) {
        const ids = sharedRefs.map(r => r.list_id);
        const { data: lists } = await supabase
          .from('shopping_lists')
          .select('*')
          .in('id', ids);
        sharedLists = lists || [];
      }
      // Sloučím a odstraním duplicity
      const allLists = [...(ownedLists || []), ...sharedLists].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setLists(allLists);
      setLoading(false);
    };
    getSessionAndLists();
    // Listen for changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) router.push('/');
      else getSessionAndLists();
    });
    // Realtime listener na shopping_lists
    const channel = supabase
      .channel('lists-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists' }, () => {
        getSessionAndLists();
      })
      .subscribe();
    return () => {
      listener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [router]);

  const handleAddList = async () => {
    if (!newListName.trim() || !session) return;
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert([{ name: newListName, owner_id: session.user.id, owner_email: session.user.email }])
      .select();
    if (!error && data && data[0]) {
      setNewListName('');
      showSuccess('Seznam byl přidán');
      router.push(`/lists/${data[0].id}`);
      return;
    }
    if (error) showError(error.message);
  };

  return (
    <main className="max-w-xl mx-auto py-8 px-4" aria-label="Přehled nákupních seznamů">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Moje nákupní seznamy</h2>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder="Název nového seznamu"
          value={newListName}
          onChange={e => setNewListName(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          onClick={handleAddList}
        >
          Přidat
        </button>
      </div>
      {loading ? (
        <SkeletonList />
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
          <span className="text-5xl mb-2">📝</span>
          <span className="mb-1">Nemáte žádné seznamy.</span>
          <span className="text-xs text-zinc-500">Vytvořte první seznam pomocí pole nahoře.</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {lists.map(list => (
            <li
              key={list.id}
              className="border rounded px-3 py-2 hover:bg-gray-700 cursor-pointer"
              onClick={() => router.push(`/lists/${list.id}`)}
            >
              <div className="font-semibold">{list.name}</div>
              {list.note && <div className="text-xs text-gray-500">{list.note}</div>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
} 