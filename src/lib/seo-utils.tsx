/* eslint-disable @typescript-eslint/no-unused-vars */
import { ReactNode } from 'react';
import Head from 'next/head'
import React from 'react'

export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  og?: {
    title?: string;
    description?: string;
    url?: string;
    siteName?: string;
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
      alt?: string;
    }>;
    locale?: string;
    type?: string;
  };
  twitter?: {
    card?: 'summary' | 'summary_large_image' | 'app' | 'player';
    title?: string;
    description?: string;
    images?: string[];
    site?: string;
  };
  robots?: {
    index?: boolean;
    follow?: boolean;
    noarchive?: boolean;
    nosnippet?: boolean;
    noimageindex?: boolean;
  };
}

export function ClientSEO({ metadata }: { metadata: SEOMetadata }) {
  return (
    <Head>
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      {metadata.keywords && <meta name="keywords" content={metadata.keywords} />}
      {metadata.canonical && <link rel="canonical" href={metadata.canonical} />}
      
      {/* Open Graph */}
      {metadata.og && (
        <>
          <meta property="og:title" content={metadata.og.title || metadata.title} />
          <meta property="og:description" content={metadata.og.description || metadata.description} />
          {metadata.og.url && <meta property="og:url" content={metadata.og.url} />}
          {metadata.og.siteName && <meta property="og:site_name" content={metadata.og.siteName} />}
          {metadata.og.locale && <meta property="og:locale" content={metadata.og.locale} />}
          {metadata.og.type && <meta property="og:type" content={metadata.og.type} />}
          {metadata.og.images?.map((image, index) => (
            <React.Fragment key={index}>
              <meta property="og:image" content={image.url} />
              {image.width && <meta property="og:image:width" content={image.width.toString()} />}
              {image.height && <meta property="og:image:height" content={image.height.toString()} />}
              {image.alt && <meta property="og:image:alt" content={image.alt} />}
            </React.Fragment>
          ))}
        </>
      )}
      
      {/* Twitter Card */}
      {metadata.twitter && (
        <>
          {metadata.twitter.card && <meta name="twitter:card" content={metadata.twitter.card} />}
          {metadata.twitter.title && <meta name="twitter:title" content={metadata.twitter.title} />}
          {metadata.twitter.description && <meta name="twitter:description" content={metadata.twitter.description} />}
          {metadata.twitter.site && <meta name="twitter:site" content={metadata.twitter.site} />}
          {metadata.twitter.images?.map((image, index) => (
            <meta key={index} name="twitter:image" content={image} />
          ))}
        </>
      )}
      
      {/* Robots */}
      {metadata.robots && (
        <meta 
          name="robots" 
          content={[
            metadata.robots.index === false ? 'noindex' : 'index',
            metadata.robots.follow === false ? 'nofollow' : 'follow',
            metadata.robots.noarchive ? 'noarchive' : '',
            metadata.robots.nosnippet ? 'nosnippet' : '',
            metadata.robots.noimageindex ? 'noimageindex' : ''
          ].filter(Boolean).join(', ')}
        />
      )}
    </Head>
  );
}