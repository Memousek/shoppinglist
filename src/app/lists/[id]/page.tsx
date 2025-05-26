/**
 * Detail a editace konkrétního nákupního seznamu.
 * Umožňuje přidávat, editovat, mazat, checkovat položky a přidávat poznámky.
 * Nově: Sdílení seznamu pomocí odkazu.
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import { showSuccess, showError, showInfo } from '../../components/toast';
import type { Session } from '@supabase/supabase-js';
import SkeletonListHeader from '../../components/skeletonListHeader';
import SkeletonItems from '../../components/skeletonItems';
import Spinner from '../../components/spinner';
import { t } from '../../i18n';

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

type Share = {
  id: string;
  list_id: string;
  share_token: string | null;
  accepted_by: string | null;
  accepted_email: string | null;
  accepted_at: string | null;
  role: 'owner' | 'editor' | 'viewer';
};

export default function ListDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [newNote, setNewNote] = useState('');
  const [listNote, setListNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemNote, setEditItemNote] = useState('');
  const [myRole, setMyRole] = useState<'owner' | 'editor' | 'viewer'>('viewer');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // View Transition API hook s animací scale-in
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mainRef.current) return;
    if ('startViewTransition' in document) {
      document.startViewTransition(() => {
        if (mainRef.current) {
          mainRef.current.classList.remove('animate-scale-in');
          // Force reflow pro restart animace
          void mainRef.current.offsetWidth;
          mainRef.current.classList.add('animate-scale-in');
        }
      });
    } else {
      // fallback: prostě přidej animaci
      if (mainRef.current) {
        mainRef.current.classList.remove('animate-scale-in');
        void mainRef.current.offsetWidth;
        mainRef.current.classList.add('animate-scale-in');
      }
    }
  }, [id]);

  useEffect(() => {
    const getSessionAndList = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session as Session | null);
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
      setShares((sharesData as Share[]) || []);
      setLoading(false);
    };
    getSessionAndList();
  }, [id, router]);

  // Realtime listener na položky a seznam
  useEffect(() => {
    if (!session) return;
    // Listener na položky
    const itemsSub = supabase
      .channel('items-list-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_items', filter: `list_id=eq.${id}` }, payload => {
        supabase
          .from('shopping_list_items')
          .select('*')
          .eq('list_id', id)
          .order('created_at', { ascending: true })
          .then(({ data }) => setItems(data || []));
        // Pokud změnu provedl někdo jiný, zobraz toast
        const newItem = payload.new as { added_by_email?: string };
        if (newItem && newItem.added_by_email && newItem.added_by_email !== session.user.email) {
          showInfo(t('list.updatedByOther'));
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
        const newList = payload.new as { updated_by_email?: string };
        if (newList && newList.updated_by_email && newList.updated_by_email !== session.user.email) {
          showInfo(t('list.updatedByOther'));
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
      showSuccess(t('list.itemAdded').replace('{name}', data[0].name));
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
    showInfo(t('list.itemDeleted'));
    await updateListTimestamp();
  };

  const handleUpdateListNote = async () => {
    await supabase
      .from('shopping_lists')
      .update({ note: listNote })
      .eq('id', id);
    setEditingNote(false);
    showInfo(t('list.noteSaved'));
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
    showInfo(t('list.itemEdited'));
    await updateListTimestamp();
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    showInfo(t('list.itemEdited'));
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
    showInfo(t('list.roleChanged'));
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
    showInfo(t('list.userRemoved'));
  };

  if (loading) return (
    <main ref={mainRef} className="max-w-xl mx-auto py-8 px-4">
      <SkeletonListHeader />
      <SkeletonItems />
    </main>
  );
  if (!list) return <main className="p-8">{t('list.notFound')}</main>;

  return (
    <main ref={mainRef} className="max-w-xl mx-auto py-8 px-4" aria-label="Detail nákupního seznamu">
      {/* Hlavička je vždy renderovaná, skeleton pouze při loadingu */}
      {loading ? (
        <SkeletonListHeader />
      ) : (
        <>
          <button
            className="mb-4 text-blue-500 hover:underline text-sm"
            onClick={() => router.push('/lists')}
          >
            ← {t('list.back')}
          </button>
          <h2 className="text-2xl font-bold mb-2">{list.name}</h2>
          <div className="mb-4">
            {editingNote ? (
              <div className="flex gap-2">
                <input
                  className="border rounded px-2 py-1 flex-1"
                  value={listNote}
                  onChange={e => setListNote(e.target.value)}
                  placeholder={t('list.notePlaceholder')}
                />
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                  onClick={handleUpdateListNote}
                  disabled={loading}
                >
                  {loading ? <Spinner size={18} /> : t('list.save')}
                </button>
                <button className="text-gray-500 px-2" onClick={() => setEditingNote(false)}>{t('list.cancel')}</button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <span className="text-gray-700 text-sm">{list.note || <span className="italic text-gray-400">{t('list.noNote')}</span>}</span>
                <button className="text-xs text-blue-600 hover:underline" onClick={() => setEditingNote(true)}>{t('list.edit')}</button>
              </div>
            )}
          </div>
          <div className="mb-2 text-xs text-gray-500" aria-live="polite">
            {t('list.role')} <span className="font-semibold">{myRole}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            {(myRole === 'editor' || myRole === 'owner') && (
              <input
                className="border rounded px-2 py-1 w-full sm:w-auto flex-1 min-w-0"
                placeholder={t('list.itemNamePlaceholder')}
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                aria-label={t('list.itemNamePlaceholder')}
              />
            )}
            {(myRole === 'editor' || myRole === 'owner') && (
              <input
                className="border rounded px-2 py-1 w-full sm:w-auto flex-1 min-w-0"
                placeholder={t('list.itemNotePlaceholder')}
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                aria-label={t('list.itemNotePlaceholder')}
              />
            )}
            {(myRole === 'editor' || myRole === 'owner') && (
              <button
                className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 focus:outline focus:ring w-full sm:w-auto"
                onClick={handleAddItem}
                aria-label={t('list.addItemAria')}
                disabled={loading}
              >
                {loading ? <Spinner size={18} /> : t('list.add')}
              </button>
            )}
          </div>
          {myRole === 'owner' && (
            <div className="flex justify-between items-center mb-4">
              <button
                className="text-sm text-blue-600 hover:underline"
                onClick={handleShare}
                aria-label={t('list.share')}
              >
                {t('list.share')}
              </button>
            </div>
          )}
        </>
      )}
      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="flex flex-col items-center justify-center py-8 text-zinc-400">
            <span className="text-5xl mb-2">🛒</span>
            <span className="mb-1">{t('list.empty')}</span>
            <span className="text-xs text-zinc-500">{t('list.emptyTip')}</span>
          </li>
        ) : (
          items.map(item => (
            <li key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 border rounded px-3 py-2 transition-all duration-200 animate-fade-in" role="listitem">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => (myRole === 'editor' || myRole === 'owner') ? handleCheckItem(item.id, item.checked) : undefined}
                aria-label={t('list.checkAria')}
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
                    placeholder={t('list.itemNotePlaceholder')}
                  />
                  <button className="text-xs text-green-600 hover:underline" onClick={() => handleSaveEditItem(item.id)}>{t('list.saveItem')}</button>
                  <button className="text-xs text-gray-600 hover:underline" onClick={handleCancelEditItem}>{t('list.cancelItem')}</button>
                </>
              ) : (
                <>
                  <span className={item.checked ? 'line-through text-gray-400' : ''}>{item.name}</span>
                  {item.note && <span className="text-xs text-gray-500 sm:ml-2">({item.note})</span>}
                  {item.added_by_email && (
                    <span className="text-xs text-gray-400 sm:ml-2">{t('list.addedBy')} {item.added_by_email}</span>
                  )}
                  <div className="flex gap-2 mt-1 sm:mt-0 sm:ml-2">
                    {(myRole === 'editor' || myRole === 'owner') && (
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => handleEditItem(item)}
                        aria-label={t('list.editItemAria') + ' ' + item.name}
                      >
                        {t('list.editItem')}
                      </button>
                    )}
                    {(myRole === 'editor' || myRole === 'owner') && (
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => handleDeleteItem(item.id)}
                        aria-label={t('list.deleteItemAria') + ' ' + item.name}
                      >
                        {t('list.deleteItem')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>
      {myRole === 'owner' && shares.filter(s => s.accepted_email).length > 0 && (
        <section className="mb-6 mt-6">
          <h3 className="font-semibold mb-2 text-base">{t('list.sharingWith')}</h3>
          <form
            className="flex gap-2 mb-4"
            onSubmit={async e => {
              e.preventDefault();
              if (!inviteEmail) return;
              setInviteLoading(true);
              const { error } = await supabase
                .from('shopping_list_shares')
                .insert({ list_id: id, share_token: crypto.randomUUID(), accepted_email: inviteEmail, role: 'viewer' });
              setInviteLoading(false);
              if (error) showError(t('list.inviteError').replace('{error}', error.message));
              else {
                setInviteEmail('');
                showSuccess(t('list.inviteSent'));
                // Refresh shares
                const { data: sharesData } = await supabase
                  .from('shopping_list_shares')
                  .select('*')
                  .eq('list_id', id);
                setShares(sharesData || []);
              }
            }}
            aria-label={t('list.inviteAria')}
          >
            <input
              type="email"
              className="border rounded px-2 py-1 flex-1 bg-zinc-900 text-white"
              placeholder={t('list.invitePlaceholder')}
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-60"
              disabled={inviteLoading}
            >
              {inviteLoading ? <Spinner size={18} /> : t('list.invite')}
            </button>
          </form>
          <ul className="space-y-2">
            {shares.filter(s => s.accepted_email).map(s => (
              <li
                key={s.id}
                className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 shadow-sm hover:border-blue-500 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                  <span className="truncate font-mono text-sm text-blue-300" title={s.accepted_email || undefined}>{s.accepted_email}</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ml-0 sm:ml-2 ${s.role === 'editor' ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'}`}
                    aria-label={t('list.changeRoleAria') + ' ' + s.role}
                  >
                    {s.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <select
                    value={s.role}
                    onChange={e => handleChangeRole(s.id, e.target.value as 'viewer' | 'editor')}
                    className="border border-zinc-700 bg-zinc-800 text-xs rounded px-2 py-1 focus:outline focus:ring focus:border-blue-500"
                    aria-label={t('list.changeRoleAria') + ' ' + s.accepted_email}
                    disabled={s.role === 'owner'}
                  >
                    <option value="owner">owner</option>
                    <option value="viewer">viewer</option>
                    <option value="editor">editor</option>
                  </select>
                  {s.role !== 'owner' && (
                  <button
                    className="text-xs text-red-500 hover:text-red-700 hover:underline px-2 py-1 rounded focus:outline focus:ring"
                    onClick={() => handleRemoveUser(s.id)}
                    aria-label={t('list.removeUserAria') + ' ' + s.accepted_email}
                  >
                    {t('list.removeUser')}
                  </button>
                  )}
                  
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {showShare && shareLink && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded shadow-lg p-6 max-w-sm w-full">
            <h3 className="font-bold mb-2">{t('list.shareLinkTitle')}</h3>
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
              {t('list.copyLink')}
            </button>
            <button
              className="text-gray-600 px-4 py-1 rounded hover:underline"
              onClick={() => setShowShare(false)}
            >
              {t('list.close')}
            </button>
          </div>
        </div>
      )}
      {list?.updated_at && list?.updated_by_email && (
        <div className="mt-8 text-xs text-gray-500" aria-live="polite">
          {t('list.lastUpdate').replace('{date}', new Date(list.updated_at).toLocaleString()).replace('{user}', list.updated_by_email)}
        </div>
      )}
    </main>
  );
} 