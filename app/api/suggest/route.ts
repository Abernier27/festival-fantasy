import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getArtistCost = (popularity: number) => {
  if (popularity >= 80) return 5;
  if (popularity >= 60) return 4;
  if (popularity >= 40) return 3;
  if (popularity >= 20) return 2;
  return 1;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const response = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=5`, {
      cache: 'no-store'
    });
    const data = await response.json();

    if (!data.data) return NextResponse.json([]);

    const suggestions = data.data.map((artist: any) => {
      const fans = artist.nb_fan || 0;
      let finalScore = 15;
      if (fans > 1000000) finalScore = 90;
      else if (fans > 300000) finalScore = 70;
      else if (fans > 80000) finalScore = 50;
      else if (fans > 15000) finalScore = 30;

      return {
        id: artist.id,
        name: artist.name,
        picture: artist.picture_small || artist.picture,
        cost: getArtistCost(finalScore)
      };
    });

    return NextResponse.json(suggestions);
  } catch (error) {
    return NextResponse.json([]);
  }
}