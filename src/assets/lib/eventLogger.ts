import { supabase } from '@/integrations/supabase/client';

type EventType = 
  | 'thread_viewed'
  | 'post_viewed'
  | 'session_start'
  | 'session_end'
  | 'thread_created'
  | 'reply_created'
  | 'post_created'
  | 'comment_created';

interface EventMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

const SESSION_KEY = 'fy_session_logged';

export const logEvent = async (
  eventType: EventType,
  options?: {
    threadId?: string;
    postId?: string;
    metadata?: EventMetadata;
  }
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('platform_events').insert({
      event_type: eventType,
      user_id: user?.id || null,
      thread_id: options?.threadId || null,
      post_id: options?.postId || null,
      metadata: options?.metadata || {},
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience for analytics
    console.error('Event logging failed:', error);
  }
};

export const logThreadView = (threadId: string) => {
  return logEvent('thread_viewed', { threadId });
};

export const logPostView = (postId: string) => {
  return logEvent('post_viewed', { postId });
};

export const logSessionStart = () => {
  // Only log once per browser session
  if (sessionStorage.getItem(SESSION_KEY)) {
    return Promise.resolve();
  }
  
  sessionStorage.setItem(SESSION_KEY, 'true');
  return logEvent('session_start');
};

export const logSessionEnd = () => {
  return logEvent('session_end');
};

export const logThreadCreated = (threadId: string) => {
  return logEvent('thread_created', { threadId });
};

export const logReplyCreated = (threadId: string) => {
  return logEvent('reply_created', { threadId });
};

export const logPostCreated = (postId: string) => {
  return logEvent('post_created', { postId });
};

export const logCommentCreated = (postId: string) => {
  return logEvent('comment_created', { postId });
};

// Initialize session tracking on page load
export const initializeSessionTracking = () => {
  // Log session start
  logSessionStart();

  // Log session end when page unloads
  const handleBeforeUnload = () => {
    // Simple beacon - the backend will handle auth
    navigator.sendBeacon?.(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/platform_events`,
      JSON.stringify({
        event_type: 'session_end',
        metadata: {},
      })
    );
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};
