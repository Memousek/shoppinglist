/**
 * Detail a editace konkrétního nákupního seznamu.
 * Umožňuje přidávat, editovat, mazat, checkovat položky a přidávat poznámky.
 * Nově: Sdílení seznamu pomocí odkazu.
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Item = {
  id: string;
  name: string;
  note: string | null;
  checked: boolean;
  added_by: string;
  added_by_email: string;
};

type List = {
  id: string;
  name: string;
  note: string | null;
  owner_email: string;
  updated_at: string;
  updated_by_email: string;
};

export default function ListDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [newNote, setNewNote] = useState('');
  const [listNote, setListNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemNote, setEditItemNote] = useState('');
  const [myRole, setMyRole] = useState<'owner' | 'editor' | 'viewer'>('viewer');

  useEffect(() => {
    const getSessionAndList = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
      if (!sessionData.session) {
        router.push('/');
        return;
      }
      setLoading(true);
      // Načti list
      const { data: listData } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      setList(listData);
      setListNote(listData?.note || '');
      // Načti položky
      const { data: itemsData } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('list_id', id)
        .order('created_at', { ascending: true });
      setItems(itemsData || []);
      // Načti všechny shares pro tento list
      const { data: sharesData } = await supabase
        .from('shopping_list_shares')
        .select('*')
        .eq('list_id', id);
      setShares(sharesData || []);
      setLoading(false);
    };
    getSessionAndList();
    // eslint-disable-next-line
  }, [id, router]);

  // Realtime listener na položky a seznam
  useEffect(() => {
    if (!session) return;
    // Listener na položky
    const itemsSub = supabase
      .channel('items-list-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_items', filter: `list_id=eq.${id}` }, payload => {
        // Znovu načti položky
        supabase
          .from('shopping_list_items')
          .select('*')
          .eq('list_id', id)
          .order('created_at', { ascending: true })
          .then(({ data }) => setItems(data || []));
        // Pokud změnu provedl někdo jiný, zobraz toast
        if (payload.new && (payload.new as any).added_by_email && (payload.new as any).added_by_email !== session.user.email) {
          toast('Seznam byl aktualizován jiným uživatelem', { icon: '🔄' });
        }
      })
      .subscribe();
    // Listener na samotný list (pro updated_at)
    const listSub = supabase
      .channel('list-meta-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists', filter: `id=eq.${id}` }, payload => {
        supabase
          .from('shopping_lists')
          .select('*')
          .eq('id', id)
          .maybeSingle()
          .then(({ data }) => setList(data));
        // Pokud změnu provedl někdo jiný, zobraz toast
        if (payload.new && (payload.new as any).updated_by_email && (payload.new as any).updated_by_email !== session.user.email) {
          toast('Seznam byl upraven jiným uživatelem', { icon: '🔄' });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(itemsSub);
      supabase.removeChannel(listSub);
    };
  }, [id, session]);

  // Robustní určení role
  useEffect(() => {
    if (!session || !list) return;
    let role: 'owner' | 'editor' | 'viewer' = 'viewer';
    if (list.owner_email === session.user.email) {
      role = 'owner';
    } else {
      const share = shares.find(s => s.accepted_email === session.user.email);
      if (share) {
        if (share.role === 'editor') role = 'editor';
        else role = 'viewer';
      }
    }
    setMyRole(role);
  }, [session, list, shares]);

  const updateListTimestamp = async () => {
    if (!session) return;
    await supabase
      .from('shopping_lists')
      .update({ updated_at: new Date().toISOString(), updated_by_email: session.user.email })
      .eq('id', id);
  };

  const handleAddItem = async () => {
    if (!newItem.trim() || !session) return;
    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert([{ name: newItem, note: newNote, list_id: id, added_by: session.user.id, added_by_email: session.user.email }])
      .select();
    if (!error && data) {
      setItems([...items, data[0]]);
      toast.success(`Přidáno: ${data[0].name}`);
      await updateListTimestamp();
    }
    setNewItem('');
    setNewNote('');
  };

  const handleCheckItem = async (itemId: string, checked: boolean) => {
    await supabase
      .from('shopping_list_items')
      .update({ checked: !checked })
      .eq('id', itemId);
    setItems(items => items.map(i => i.id === itemId ? { ...i, checked: !checked } : i));
    await updateListTimestamp();
  };

  const handleDeleteItem = async (itemId: string) => {
    await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', itemId);
    setItems(items => items.filter(i => i.id !== itemId));
    toast('Položka smazána', { icon: '🗑️' });
    await updateListTimestamp();
  };

  const handleUpdateListNote = async () => {
    await supabase
      .from('shopping_lists')
      .update({ note: listNote })
      .eq('id', id);
    setEditingNote(false);
  };

  const handleShare = async () => {
    // Zkus najít existující share token
    const { data: existing } = await supabase
      .from('shopping_list_shares')
      .select('*')
      .eq('list_id', id)
      .maybeSingle();
    let token = existing?.share_token;
    if (!token) {
      // Vygeneruj nový share token
      token = crypto.randomUUID();
      await supabase
        .from('shopping_list_shares')
        .insert({ list_id: id, share_token: token });
    }
    setShareLink(`${window.location.origin}/share/${token}`);
    setShowShare(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemNote(item.note || '');
  };

  const handleSaveEditItem = async (itemId: string) => {
    await supabase
      .from('shopping_list_items')
      .update({ name: editItemName, note: editItemNote })
      .eq('id', itemId);
    setItems(items => items.map(i => i.id === itemId ? { ...i, name: editItemName, note: editItemNote } : i));
    setEditingItemId(null);
    toast('Položka upravena', { icon: '✏️' });
    await updateListTimestamp();
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
  };

  // Funkce pro změnu role uživatele (pouze owner)
  const handleChangeRole = async (shareId: string, newRole: 'viewer' | 'editor') => {
    await supabase
      .from('shopping_list_shares')
      .update({ role: newRole })
      .eq('id', shareId);
    // Refresh shares
    const { data: sharesData } = await supabase
      .from('shopping_list_shares')
      .select('*')
      .eq('list_id', id);
    setShares(sharesData || []);
    toast.success('Role uživatele změněna');
  };

  const handleRemoveUser = async (shareId: string) => {
    await supabase
      .from('shopping_list_shares')
      .delete()
      .eq('id', shareId);
    // Refresh shares
    const { data: sharesData } = await supabase
      .from('shopping_list_shares')
      .select('*')
      .eq('list_id', id);
    setShares(sharesData || []);
    toast('Uživatel odebrán', { icon: '🚫' });
  };

  if (loading) return <main className="p-8">Načítám...</main>;
  if (!list) return <main className="p-8">Seznam nenalezen.</main>;

  return (
    <main className="max-w-xl mx-auto py-8 px-4">
      <button
        className="mb-4 text-blue-500 hover:underline text-sm"
        onClick={() => router.push('/lists')}
      >
        ← Zpět na seznamy
      </button>
      <h2 className="text-2xl font-bold mb-2">{list.name}</h2>
      <div className="mb-4">
        {editingNote ? (
          <div className="flex gap-2">
            <input
              className="border rounded px-2 py-1 flex-1"
              value={listNote}
              onChange={e => setListNote(e.target.value)}
              placeholder="Poznámka k seznamu"
            />
            <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleUpdateListNote}>Uložit</button>
            <button className="text-gray-500 px-2" onClick={() => setEditingNote(false)}>Zrušit</button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <span className="text-gray-700 text-sm">{list.note || <span className="italic text-gray-400">Bez poznámky</span>}</span>
            <button className="text-xs text-blue-600 hover:underline" onClick={() => setEditingNote(true)}>Upravit</button>
          </div>
        )}
      </div>
      <div className="mb-2 text-xs text-gray-500" aria-live="polite">
        Vaše role: <span className="font-semibold">{myRole}</span>
      </div>
      <div className="flex gap-2 mb-4">
        {(myRole === 'editor' || myRole === 'owner') && (
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Název položky"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            aria-label="Název položky"
          />
        )}
        {(myRole === 'editor' || myRole === 'owner') && (
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Poznámka"
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            aria-label="Poznámka"
          />
        )}
        {(myRole === 'editor' || myRole === 'owner') && (
          <button
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 focus:outline focus:ring"
            onClick={handleAddItem}
            aria-label="Přidat položku"
          >
            Přidat
          </button>
        )}
      </div>
      {myRole === 'owner' && (
        <div className="flex justify-between items-center mb-4">
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={handleShare}
            aria-label="Sdílet seznam"
          >
            Sdílet seznam
          </button>
        </div>
      )}
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-2 border rounded px-3 py-2" role="listitem">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => (myRole === 'editor' || myRole === 'owner') ? handleCheckItem(item.id, item.checked) : undefined}
              aria-label="Označit jako koupené"
              disabled={myRole === 'viewer'}
            />
            {editingItemId === item.id ? (
              <>
                <input
                  className="border rounded px-2 py-1 flex-1"
                  value={editItemName}
                  onChange={e => setEditItemName(e.target.value)}
                />
                <input
                  className="border rounded px-2 py-1 flex-1"
                  value={editItemNote}
                  onChange={e => setEditItemNote(e.target.value)}
                  placeholder="Poznámka"
                />
                <button className="text-xs text-green-600 hover:underline" onClick={() => handleSaveEditItem(item.id)}>Uložit</button>
                <button className="text-xs text-gray-600 hover:underline" onClick={handleCancelEditItem}>Zrušit</button>
              </>
            ) : (
              <>
                <span className={item.checked ? 'line-through text-gray-400' : ''}>{item.name}</span>
                {item.note && <span className="text-xs text-gray-500 ml-2">({item.note})</span>}
                {item.added_by_email && (
                  <span className="text-xs text-gray-400 ml-2">přidal: {item.added_by_email}</span>
                )}
                {(myRole === 'editor' || myRole === 'owner') && (
                  <button
                    className="text-xs text-blue-600 hover:underline ml-2"
                    onClick={() => handleEditItem(item)}
                    aria-label={`Upravit položku ${item.name}`}
                  >
                    Upravit
                  </button>
                )}
              </>
            )}
            {(myRole === 'editor' || myRole === 'owner') && (
              <button
                className="ml-auto text-xs text-red-600 hover:underline"
                onClick={() => handleDeleteItem(item.id)}
                aria-label={`Smazat položku ${item.name}`}
              >
                Smazat
              </button>
            )}
          </li>
        ))}
      </ul>
      {myRole === 'owner' && shares.filter(s => s.accepted_email).length > 0 && (
        <section className="mb-6 mt-6">
          <h3 className="font-semibold mb-2 text-base">Sdíleno s uživateli:</h3>
          <ul className="space-y-2">
            {shares.filter(s => s.accepted_email).map(s => (
              <li
                key={s.id}
                className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 shadow-sm hover:border-blue-500 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                  <span className="truncate font-mono text-sm text-blue-300" title={s.accepted_email}>{s.accepted_email}</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ml-0 sm:ml-2 ${s.role === 'editor' ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'}`}
                    aria-label={`Role: ${s.role}`}
                  >
                    {s.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <select
                    value={s.role}
                    onChange={e => handleChangeRole(s.id, e.target.value as 'viewer' | 'editor')}
                    className="border border-zinc-700 bg-zinc-800 text-xs rounded px-2 py-1 focus:outline focus:ring focus:border-blue-500"
                    aria-label={`Změnit roli pro ${s.accepted_email}`}
                  >
                    <option value="viewer">viewer</option>
                    <option value="editor">editor</option>
                  </select>
                  <button
                    className="text-xs text-red-500 hover:text-red-700 hover:underline px-2 py-1 rounded focus:outline focus:ring"
                    onClick={() => handleRemoveUser(s.id)}
                    aria-label={`Odebrat uživatele ${s.accepted_email}`}
                  >
                    Odebrat
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {showShare && shareLink && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
            <h3 className="font-bold mb-2">Sdílejte tento odkaz:</h3>
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              value={shareLink}
              readOnly
              onFocus={e => e.target.select()}
            />
            <button
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 mr-2"
              onClick={() => {navigator.clipboard.writeText(shareLink!)}}
            >
              Kopírovat odkaz
            </button>
            <button
              className="text-gray-600 px-4 py-1 rounded hover:underline"
              onClick={() => setShowShare(false)}
            >
              Zavřít
            </button>
          </div>
        </div>
      )}
      {list?.updated_at && list?.updated_by_email && (
        <div className="mt-8 text-xs text-gray-500" aria-live="polite">
          Poslední update v {new Date(list.updated_at).toLocaleString()} od {list.updated_by_email}
        </div>
      )}
    </main>
  );
} 