import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Sitemap() {
  const [xml, setXml] = useState<string>('');
  const containerRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const fetchSitemap = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('sitemap');
        if (error) throw error;
        setXml(data);
      } catch (err) {
        console.error('Error fetching sitemap:', err);
        // Fallback static sitemap
        const baseUrl = 'https://foundersyard.in';
        setXml(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/about</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/features</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/forums</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
</urlset>`);
      }
    };

    fetchSitemap();
  }, []);

  // Safely render XML content using textContent instead of innerHTML (XSS prevention)
  useEffect(() => {
    if (xml && containerRef.current) {
      // Clear existing content safely
      containerRef.current.textContent = xml;
      document.title = 'Sitemap - FoundersYard';
      
      // Set content type for crawlers
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Type';
      meta.content = 'application/xml; charset=utf-8';
      document.head.appendChild(meta);
    }
  }, [xml]);

  return (
    <pre
      ref={containerRef}
      style={{ 
        wordWrap: 'break-word', 
        whiteSpace: 'pre-wrap',
        padding: '1rem',
        fontFamily: 'monospace'
      }}
    />
  );
}
