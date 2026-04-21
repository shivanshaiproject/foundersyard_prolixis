import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Comment = Tables<'comments'>;
type Profile = Tables<'profiles'>;

export interface CommentWithAuthor extends Comment {
  author: Profile;
  replies?: CommentWithAuthor[];
}

export function useComments(postId: string) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`*, author:profiles!comments_user_id_fkey(*)`)
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const { data: replies } = await supabase
        .from('comments')
        .select(`*, author:profiles!comments_user_id_fkey(*)`)
        .eq('post_id', postId)
        .not('parent_id', 'is', null)
        .order('created_at', { ascending: true });

      // Build nested replies recursively
      const buildReplies = (parentId: string): CommentWithAuthor[] => {
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
    if (postId) fetchComments();
  }, [postId]);

  const addComment = async (content: string, parentId?: string, postAuthorId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('comments')
      .insert({
        content,
        post_id: postId,
        user_id: user.id,
        parent_id: parentId || null,
      })
      .select(`*, author:profiles!comments_user_id_fkey(*)`)
      .single();

    if (!error) {
      fetchComments();
      
      // Create notification for post author (if not self, and not a reply)
      if (!parentId && postAuthorId && postAuthorId !== user.id) {
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('notifications_enabled')
          .eq('id', postAuthorId)
          .single();

        if (targetProfile?.notifications_enabled !== false) {
          await supabase.from('notifications').insert({
            user_id: postAuthorId,
            actor_id: user.id,
            type: 'comment',
            post_id: postId,
          });
        }
      }

      // Create notification for parent comment author (reply notification)
      if (parentId) {
        const { data: parentComment } = await supabase
          .from('comments')
          .select('user_id')
          .eq('id', parentId)
          .single();

        if (parentComment && parentComment.user_id !== user.id) {
          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('notifications_enabled')
            .eq('id', parentComment.user_id)
            .single();

          if (targetProfile?.notifications_enabled !== false) {
            await supabase.from('notifications').insert({
              user_id: parentComment.user_id,
              actor_id: user.id,
              type: 'reply',
              post_id: postId,
            });
          }
        }

        // Also notify post author about the reply (if different from parent comment author)
        if (postAuthorId && postAuthorId !== user.id && postAuthorId !== parentComment?.user_id) {
          const { data: postAuthorProfile } = await supabase
            .from('profiles')
            .select('notifications_enabled')
            .eq('id', postAuthorId)
            .single();

          if (postAuthorProfile?.notifications_enabled !== false) {
            await supabase.from('notifications').insert({
              user_id: postAuthorId,
              actor_id: user.id,
              type: 'comment',
              post_id: postId,
            });
          }
        }
      }
    }
    return { data, error };
  };

  const editComment = async (commentId: string, content: string) => {
    const { error } = await supabase
      .from('comments')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', commentId);

    if (!error) fetchComments();
    return { error };
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) fetchComments();
    return { error };
  };

  return { comments, loading, error, fetchComments, addComment, editComment, deleteComment };
}
