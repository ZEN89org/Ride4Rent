import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ConversationItem, getConversationPage } from "@/services/messageService";

export function useConversations(archived = false, search = "") {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);
  const moreRef = useRef<() => Promise<void>>(async () => {});
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const userId = user?.id;
  const mutationRevision = useRef(0);
  const resetPage = useRef(false);

  useFocusEffect(useCallback(() => {
    if (authLoading || !userId) return;
    let active = true;
    let pending = false;
    let nextPage = 2;
    let moreAvailable = false;
    let firstLoad = true;
    setLoading(true);
    setLoadingMore(false);
    setRefreshing(false);
    setConversations([]);
    setHasMore(false);
    const load = async (reset = false) => {
      if (!active || pending || AppState.currentState === "background" || AppState.currentState === "inactive") return;
      pending = true;
      const revision = mutationRevision.current;
      try {
        const data = await getConversationPage(1, archived, search);
        if (active && revision === mutationRevision.current) {
          if (firstLoad || reset || resetPage.current) { setConversations(data.items); nextPage = 2; moreAvailable = data.hasMore; resetPage.current = false; }
          else setConversations(previous => {
            const head = new Set(data.items.map(item => item.user_id));
            const merged = [...data.items, ...previous.filter(item => !head.has(item.user_id))];
            return merged.sort((a,b) => (Date.parse(b.last_message_at || "") || 0) - (Date.parse(a.last_message_at || "") || 0) || (b.last_message_id || 0) - (a.last_message_id || 0));
          });
          firstLoad = false; setHasMore(moreAvailable); setArchivedCount(data.archivedCount);
        }
      } catch (error) {
        console.warn("Unable to refresh conversations", error instanceof Error ? error.message : "Request failed");
      } finally {
        pending = false;
        if (active) { setLoading(false); setRefreshing(false); }
      }
    };
    refreshRef.current = () => load(true);
    moreRef.current = async () => {
      if (!active || pending || !moreAvailable) return;
      if (resetPage.current) { await load(true); return; }
      pending = true; setLoadingMore(true);
      const revision = mutationRevision.current;
      try {
        const data = await getConversationPage(nextPage, archived, search);
        if (active && revision === mutationRevision.current) {
          setConversations(previous => { const ids = new Set(previous.map(item => item.user_id)); return [...previous, ...data.items.filter(item => !ids.has(item.user_id))]; });
          nextPage++; moreAvailable = data.hasMore; setHasMore(data.hasMore);
        }
      } catch { console.warn("Unable to load more conversations."); }
      finally { pending = false; if (active) setLoadingMore(false); }
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
      refreshRef.current = async () => {};
      moreRef.current = async () => {};
    };
  }, [authLoading, userId, archived, search]));

  const refresh = useCallback(() => {
    setRefreshing(true);
    void refreshRef.current();
  }, []);
  const mutate = useCallback(async (operation: () => Promise<void>, update: (items: ConversationItem[]) => ConversationItem[]) => {
    mutationRevision.current++;
    try { await operation(); setConversations(update); }
    finally { mutationRevision.current++; resetPage.current = true; void refreshRef.current(); }
  }, []);
  return { conversations, setConversations, loading, refreshing, refresh, mutate, hasMore, loadingMore, archivedCount, loadMore: () => { void moreRef.current(); } };
}
