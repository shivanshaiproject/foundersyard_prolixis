import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type ShortComment = Tables<'short_comments'>;
type Profile = Tables<'profiles'>;

export interface ShortCommentWithAuthor extends ShortComment {
  author: Profile;
  replies?: ShortCommentWithAuthor[];
}

export function useShortComments(shortId: string) {
  const [comments, setComments] = useState<ShortCommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!shortId) return;
    
    setLoading(true);
    try {
      // Fetch top-level comments
      const { data, error } = await supabase
        .from('short_comments')
        .select(`*, author:profiles!short_comments_user_id_fkey(*)`)
        .eq('short_id', shortId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch replies
      const { data: replies } = await supabase
        .from('short_comments')
        .select(`*, author:profiles!short_comments_user_id_fkey(*)`)
        .eq('short_id', shortId)
        .not('parent_id', 'is', null)
        .order('created_at', { ascending: true });

      // Build nested replies
      const buildReplies = (parentId: string): ShortCommentWithAuthor[] => {
        return (replies || [])
          .filter(r => r.parent_id === parentId)
          .map(r => ({
            ...r,
            author: r.author as Profile,
            replies: buildReplies(r.id),
          }));
      };

      const commentsWithReplies = (data || []).map(comment => ({
        ...comment,
        author: comment.author as Profile,
        replies: buildReplies(comment.id),
      }));

      setComments(commentsWithReplies);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shortId) fetchComments();
  }, [shortId]);

  const addComment = async (content: string, parentId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('short_comments')
      .insert({
        content,
        short_id: shortId,
        user_id: user.id,
        parent_id: parentId || null,
      })
      .select(`*, author:profiles!short_comments_user_id_fkey(*)`)
      .single();

    if (!error) {
      fetchComments();
      
      // Increment comments_count on shorts table using direct update
      await supabase
        .from('shorts')
        .update({ comments_count: (comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0) + 1) })
        .eq('id', shortId);
    }
    
    return { data, error };
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('short_comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      fetchComments();
    }
    
    return { error };
  };

  const editComment = async (commentId: string, content: string) => {
    const { error } = await supabase
      .from('short_comments')
      .update({ content })
      .eq('id', commentId);

    if (!error) fetchComments();
    return { error };
  };

  return { 
    comments, 
    loading, 
    error, 
    fetchComments, 
    addComment, 
    editComment, 
    deleteComment,
    commentsCount: comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)
  };
}
