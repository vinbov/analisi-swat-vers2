"use client";

import type { ScrapedAd } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';

interface TableScrapedAdsProps {
  ads: ScrapedAd[];
}

export function TableScrapedAds({ ads }: TableScrapedAdsProps) {
  if (ads.length === 0) {
    return <p className="text-muted-foreground py-4">Nessun annuncio da visualizzare.</p>;
  }

  const headers = ["Immagine", "Titolo", "Testo", "Link"];

  return (
    <div className="table-container">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header} scope="col">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {ads.map((ad) => (
            <tr key={ad.id}>
              <td className="w-24 h-24 p-1">
                {ad.immagine ? (
                  <Link href={ad.immagine} target="_blank" rel="noopener noreferrer">
                    <Image 
                      src={ad.immagine} 
                      alt={`Anteprima per "${ad.titolo}"`} 
                      width={80} 
                      height={80} 
                      className="object-contain rounded max-w-full max-h-full"
                      data-ai-hint="advertisement creative"
                      onError={(e) => { e.currentTarget.src = 'https://placehold.co/80x80.png?text=No+Img'; }} // Fallback
                    />
                  </Link>
                ) : (
                  <Image src="https://placehold.co/80x80.png?text=No+Img" alt="Nessuna Immagine" width={80} height={80} className="object-contain rounded" data-ai-hint="placeholder image" />
                )}
              </td>
              <td className="wrap-text-detail font-medium text-foreground">{ad.titolo || "N/D"}</td>
              <td className="wrap-text-detail">{ad.testo || "N/D"}</td>
              <td className="truncate-url">
                {ad.link ? (
                  <Link href={ad.link} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 hover:underline" title={ad.link}>
                    {ad.link.length > 30 ? ad.link.substring(0, 27) + '...' : ad.link}
                  </Link>
                ) : (
                  "N/D"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
