import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) return NextResponse.json([]);

  try {
    const response = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=5`, {
      cache: 'no-store'
    });
    const data = await response.json();

    if (!data.data) {
      return NextResponse.json([]);
    }

    const suggestions = data.data.map((artist: any) => {
      const fans = artist.nb_fan || 0;
      let score = 1;
      if (fans > 1000000) score = 5;
      else if (fans > 300000) score = 4;
      else if (fans > 80000) score = 3;
      else if (fans > 15000) score = 2;

      return {
        name: artist.name,
        popularity: score,
        image: artist.picture_medium || artist.picture
      };
    });

    return NextResponse.json(suggestions);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur suggestions' }, { status: 500 });
  }
}