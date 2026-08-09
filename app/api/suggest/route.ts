import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) return NextResponse.json({ error: 'Recherche vide' }, { status: 400 });

  try {
    // 1. On demande 10 résultats à Deezer pour être sûr de trouver le vrai artiste
    const response = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=10`, {
      cache: 'no-store'
    });
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ error: 'Artiste introuvable' }, { status: 404 });
    }

    // 2. LE RETOUR DU BOUCLIER : On trie les 10 résultats du plus suivi au moins suivi
    const sortedArtists = data.data.sort((a: any, b: any) => 
      (b.nb_fan || 0) - (a.nb_fan || 0)
    );

    // On sélectionne le vrai artiste (le premier de la liste triée)
    const bestArtist = sortedArtists[0];
    const fans = bestArtist.nb_fan || 0;

    // 3. BARÈME AJUSTÉ POUR DEEZER
    let finalScore = 15; // 1 point par défaut
    
    if (fans > 1000000) {
      finalScore = 90; // 5 pts : Méga-stars (+ de 1M fans sur Deezer)
    } else if (fans > 300000) {
      finalScore = 70; // 4 pts : Têtes d'affiche
    } else if (fans > 80000) {
      finalScore = 50; // 3 pts : Artistes confirmés
    } else if (fans > 15000) {
      finalScore = 30; // 2 pts : Artistes émergents
    }

    // 4. CASCADE D'IMAGES : Si la XL n'existe pas, on prend la taille en dessous
    const imageUrl = bestArtist.picture_xl 
      || bestArtist.picture_big 
      || bestArtist.picture_medium 
      || bestArtist.picture 
      || 'https://via.placeholder.com/150';

    return NextResponse.json({
      name: bestArtist.name,
      popularity: finalScore,
      genres: ['Live Music', 'Festival'], 
      image: imageUrl,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erreur Serveur Deezer' }, { status: 500 });
  }
}   