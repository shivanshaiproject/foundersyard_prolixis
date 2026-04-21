import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type DateFilter = 'today' | 'yesterday' | 'week';

interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string | null;
  icon_url: string | null;
  website_url: string;
  screenshots: string[];
  video_url: string | null;
  category: string;
  maker_id: string;
  upvotes_count: number;
  comments_count: number;
  launch_date: string;
  launch_time: string;
  is_featured: boolean;
  status: string;
  created_at: string;
  maker?: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
    bio?: string | null;
    company_name?: string | null;
    position?: string | null;
    location?: string | null;
    is_verified?: boolean | null;
    linkedin_url?: string | null;
  } | null;
}

export function useProducts(filter: DateFilter = 'today') {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products for the selected date filter
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', filter],
    queryFn: async () => {
      const today = new Date();
      let startDate: string;
      let endDate: string;

      if (filter === 'today') {
        startDate = today.toISOString().split('T')[0];
        endDate = startDate;
      } else if (filter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0];
        endDate = startDate;
      } else {
        // This week
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          maker:profiles!products_maker_id_fkey(
            id, full_name, username, avatar_url, bio, company_name, 
            position, location, is_verified, linkedin_url
          )
        `)
        .gte('launch_date', startDate)
        .lte('launch_date', endDate)
        .in('status', ['live', 'approved'])
        .eq('is_featured', false)
        .order('upvotes_count', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch featured products (paid spotlight)
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ['featured-products', filter],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          maker:profiles!products_maker_id_fkey(
            id, full_name, username, avatar_url
          )
        `)
        .eq('is_featured', true)
        .in('status', ['live', 'approved'])
        .order('upvotes_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch user's upvotes
  const { data: userUpvotes = [] } = useQuery({
    queryKey: ['product-upvotes', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('product_upvotes')
        .select('product_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map((u) => u.product_id);
    },
    enabled: !!user,
  });

  // Toggle upvote mutation
  const upvoteMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('toggle_product_upvote', {
        p_product_id: productId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return { productId, isUpvoted: data };
    },
    onMutate: async (productId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['products', filter] });
      await queryClient.cancelQueries({ queryKey: ['product-upvotes', user?.id] });

      const previousProducts = queryClient.getQueryData(['products', filter]);
      const previousUpvotes = queryClient.getQueryData(['product-upvotes', user?.id]);

      const isCurrentlyUpvoted = userUpvotes.includes(productId);

      queryClient.setQueryData(['products', filter], (old: Product[] | undefined) =>
        old?.map((p) =>
          p.id === productId
            ? { ...p, upvotes_count: p.upvotes_count + (isCurrentlyUpvoted ? -1 : 1) }
            : p
        )
      );

      queryClient.setQueryData(['product-upvotes', user?.id], (old: string[] | undefined) =>
        isCurrentlyUpvoted
          ? old?.filter((id) => id !== productId)
          : [...(old || []), productId]
      );

      return { previousProducts, previousUpvotes };
    },
    onError: (err, productId, context) => {
      queryClient.setQueryData(['products', filter], context?.previousProducts);
      queryClient.setQueryData(['product-upvotes', user?.id], context?.previousUpvotes);
      toast({
        title: 'Error',
        description: 'Failed to update vote',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products', filter] });
      queryClient.invalidateQueries({ queryKey: ['product-upvotes', user?.id] });
    },
  });

  // Fetch top picks (paid sidebar)
  const { data: topPicks = [] } = useQuery({
    queryKey: ['top-picks'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('product_placements')
        .select(`
          product:products(id, slug, name, tagline, icon_url)
        `)
        .eq('placement_type', 'top_picks')
        .eq('placement_date', today)
        .eq('status', 'active')
        .limit(3);

      if (error) throw error;
      return data?.map((p) => p.product).filter(Boolean) || [];
    },
  });

  // Fetch recommended tool (paid sidebar)
  const { data: recommendedTool } = useQuery({
    queryKey: ['recommended-tool'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('product_placements')
        .select(`
          product:products(id, slug, name, tagline, icon_url, website_url)
        `)
        .eq('placement_type', 'recommended_tool')
        .eq('placement_date', today)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.product || null;
    },
  });

  // Fetch maker highlight (free, organic rotation) - Only show makers with products
  const { data: makerHighlight } = useQuery({
    queryKey: ['maker-highlight'],
    queryFn: async () => {
      // Get products with their makers (only those with live/approved products)
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          maker_id,
          maker:profiles!products_maker_id_fkey(
            id, full_name, avatar_url, company_name, username
          )
        `)
        .in('status', ['live', 'approved']);

      if (error) throw error;

      // Count products per maker
      const makerProductsMap = new Map<string, { maker: any; products_count: number }>();
      
      productsData?.forEach((p) => {
        if (p.maker && p.maker_id) {
          const existing = makerProductsMap.get(p.maker_id);
          if (existing) {
            existing.products_count += 1;
          } else {
            makerProductsMap.set(p.maker_id, {
              maker: p.maker,
              products_count: 1,
            });
          }
        }
      });

      // Convert to array and filter those with at least 1 product
      const makersWithProducts = Array.from(makerProductsMap.values());
      
      if (makersWithProducts.length > 0) {
        // Randomly select one
        const randomIndex = Math.floor(Math.random() * makersWithProducts.length);
        const selected = makersWithProducts[randomIndex];
        return {
          ...selected.maker,
          products_count: selected.products_count,
        };
      }
      return null;
    },
  });

  return {
    products,
    featuredProducts,
    userUpvotes: new Set(userUpvotes),
    isLoading: productsLoading,
    toggleUpvote: upvoteMutation.mutate,
    topPicks,
    recommendedTool,
    makerHighlight,
  };
}

export function useProduct(slug: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          maker:profiles!products_maker_id_fkey(
            id, full_name, username, avatar_url, bio, company_name, 
            position, location, is_verified, linkedin_url
          )
        `)
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as Product | null;
    },
    enabled: !!slug,
  });

  const { data: isUpvoted = false } = useQuery({
    queryKey: ['product-upvote', product?.id, user?.id],
    queryFn: async () => {
      if (!user || !product) return false;

      const { data, error } = await supabase
        .from('product_upvotes')
        .select('id')
        .eq('product_id', product.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!product,
  });

  const upvoteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !product) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('toggle_product_upvote', {
        p_product_id: product.id,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', slug] });
      queryClient.invalidateQueries({ queryKey: ['product-upvote', product?.id, user?.id] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update vote',
        variant: 'destructive',
      });
    },
  });

  return {
    product,
    isLoading,
    isUpvoted,
    toggleUpvote: upvoteMutation.mutate,
  };
}
