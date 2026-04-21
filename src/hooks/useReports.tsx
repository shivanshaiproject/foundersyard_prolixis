import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateReportParams {
  reason: string;
  description?: string;
  postId?: string;
  commentId?: string;
}

export function useReports() {
  const { user } = useAuth();

  const createReport = async ({ reason, description, postId, commentId }: CreateReportParams) => {
    if (!user) {
      return { error: { message: 'You must be logged in to report content' } };
    }

    if (!postId && !commentId) {
      return { error: { message: 'No content specified to report' } };
    }

    // Validate input
    if (!reason || reason.length < 1 || reason.length > 100) {
      return { error: { message: 'Invalid reason' } };
    }

    if (description && description.length > 500) {
      return { error: { message: 'Description too long' } };
    }

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reason: reason.trim(),
      description: description?.trim() || null,
      post_id: postId || null,
      comment_id: commentId || null,
    });

    return { error };
  };

  return { createReport };
}