/**
 * Stránka pro zobrazení sdíleného shopping listu a možnost přidání do svých seznamů.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import type { Session } from '@supabase/supabase-js';

type List = {
  id: string;
  name: string;
  note: string | null;
};

type Item = {
  id: string;
  name: string;
  note: string | null;
  checked: boolean;
};

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const router = useRouter();
  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [alreadyAdded, setAlreadyAdded] = useState(false);

  useEffect(() => {
    const getSessionAndList = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
      // Najdi share z tokenu
      const { data: share } = await supabase
        .from('shopping_list_shares')
        .select('*, shopping_lists(*)')
        .eq('share_token', shareId)
        .maybeSingle();
      if (!share || !share.shopping_lists) {
        setList(null);
        setLoading(false);
        return;
      }
      setList(share.shopping_lists);
      // Načti položky
      const { data: itemsData } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('list_id', share.shopping_lists.id)
        .order('created_at', { ascending: true });
      setItems(itemsData || []);
      // Zjisti, jestli uživatel už má tento list ve svých
      if (sessionData.session) {
        const { data: myList } = await supabase
          .from('shopping_lists')
          .select('id')
          .eq('id', share.shopping_lists.id)
          .eq('owner_id', sessionData.session.user.id)
          .maybeSingle();
        setAlreadyAdded(!!myList);
      }
      setLoading(false);
    };
    getSessionAndList();
  }, [shareId]);

  const handleAddToMyLists = async () => {
    if (!session || !list) return;
    // Přidej accepted_by a accepted_email do shopping_list_shares
    await supabase
      .from('shopping_list_shares')
      .update({ accepted_by: session.user.id, accepted_email: session.user.email, accepted_at: new Date().toISOString() })
      .eq('share_token', shareId);
    setAlreadyAdded(true);
    router.push(`/lists/${list.id}`);
  };

  if (loading) return <main className="p-8">Načítám...</main>;
  if (!list) return <main className="p-8">Sdílený seznam nenalezen.</main>;

  return (
    <main className="max-w-xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold mb-2">{list.name}</h2>
      <div className="mb-4 text-gray-700 text-sm">{list.note}</div>
      <ul className="space-y-2 mb-6">
        {items.map(item => (
          <li key={item.id} className="border rounded px-3 py-2 flex items-center gap-2">
            <span>{item.name}</span>
            {item.note && <span className="text-xs text-gray-500 ml-2">({item.note})</span>}
          </li>
        ))}
      </ul>
      {alreadyAdded ? (
        <div className="text-green-600 font-semibold">Tento seznam už máte mezi svými.</div>
      ) : (
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleAddToMyLists}
        >
          Přidat tento seznam do mých nákupních listů
        </button>
      )}
    </main>
  );
} 