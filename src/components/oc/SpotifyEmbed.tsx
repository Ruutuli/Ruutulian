'use client';

interface SpotifyEmbedProps {
  url: string;
}

/**
 * Extracts Spotify embed information from a Spotify URL
 * Supports: track, album, playlist, artist
 */
function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  try {
    // Match patterns like:
    // https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC
    // https://open.spotify.com/album/...
    // https://open.spotify.com/playlist/...
    // https://open.spotify.com/artist/...
    const match = url.match(/open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
    if (match) {
      return {
        type: match[1],
        id: match[2],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function SpotifyEmbed({ url }: SpotifyEmbedProps) {
  const spotifyData = parseSpotifyUrl(url);

  if (!spotifyData) {
    // Not a valid Spotify URL, return null to fall back to regular link
    return null;
  }

  const embedUrl = `https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}?utm_source=generator&theme=0`;

  return (
    <div className="mt-3">
      <iframe
        src={embedUrl}
        width="100%"
        height={spotifyData.type === 'track' ? '152' : '352'}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="rounded-lg"
        style={{ minHeight: spotifyData.type === 'track' ? '152px' : '352px' }}
      />
    </div>
  );
}














