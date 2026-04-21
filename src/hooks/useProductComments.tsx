import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  user: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface RawComment {
  id: string;
  product_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  likes_count: number;
  user: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export function useProductComments(productId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['product-comments', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_comments')
        .select(`
          id,
          product_id,
          user_id,
          parent_id,
          content,
          created_at,
          likes_count,
          user:profiles!product_comments_user_id_fkey(
            id, full_name, username, avatar_url
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize into nested structure
      const rawComments = data as RawComment[];
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      // First pass: create all comment objects
      rawComments.forEach((c) => {
        commentMap.set(c.id, {
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          likes_count: c.likes_count || 0,
          user: c.user,
          replies: [],
        });
      });

      // Second pass: organize into tree
      rawComments.forEach((c) => {
        const comment = commentMap.get(c.id)!;
        if (c.parent_id) {
          const parent = commentMap.get(c.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      return rootComments;
    },
    enabled: !!productId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!productId) return;

    const channel = supabase
      .channel(`product-comments-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_comments',
          filter: `product_id=eq.${productId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['product-comments', productId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, queryClient]);

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user) throw new Error('Not authenticated');

      setIsSubmitting(true);

      const { error } = await supabase.from('product_comments').insert({
        product_id: productId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
      });

      if (error) throw error;

      // Update comment count
      await supabase.rpc('update_user_streak', { p_user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-comments', productId] });
      toast({ title: 'Comment posted!' });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const submitComment = (content: string, parentId?: string) => {
    addCommentMutation.mutate({ content, parentId });
  };

  return {
    comments,
    isLoading,
    isSubmitting,
    submitComment,
  };
}
