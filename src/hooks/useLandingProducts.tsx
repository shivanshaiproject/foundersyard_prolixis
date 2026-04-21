import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LandingProduct {
  id: string;
  name: string;
  tagline: string | null;
  icon_url: string | null;
  slug: string;
  upvotes_count: number;
  category: string | null;
}

export function useLandingProducts() {
  return useQuery({
    queryKey: ['landing-products'],
    queryFn: async (): Promise<LandingProduct[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, tagline, icon_url, slug, upvotes_count, category')
        .in('status', ['live', 'approved'])
        .order('launch_date', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
