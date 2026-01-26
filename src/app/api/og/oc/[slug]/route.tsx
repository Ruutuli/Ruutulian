import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { getSiteConfig } from '@/lib/config/site-config';
import { logger } from '@/lib/logger';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();
    const config = await getSiteConfig();

    const { data: oc, error } = await supabase
      .from('ocs')
      .select('name, world:worlds(name)')
      .eq('slug', resolvedParams.slug)
      .eq('is_public', true)
      .maybeSingle();

    if (error) {
      logger.error('API', 'Supabase query error while generating OC OG image', {
        slug: resolvedParams.slug,
        error: error.message,
        code: error.code,
      });
    }

    if (!oc) {
      return new Response('Character not found', { status: 404 });
    }

    const world = oc.world as any;

    // Use standard landscape format (1200x630) with centered content
    // This prevents squishing while maintaining compatibility with social platforms
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111827',
            position: 'relative',
          }}
        >
          {/* Background gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            }}
          />
          
          {/* Decorative pattern */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.1,
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
          
          {/* Main content container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              padding: '60px',
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            <h1
              style={{
                fontSize: '80px',
                fontWeight: 'bold',
                color: '#ffffff',
                margin: 0,
                marginBottom: '20px',
                textShadow: '3px 3px 12px rgba(0,0,0,0.9)',
                lineHeight: '1.1',
                maxWidth: '1000px',
              }}
            >
              {oc.name}
            </h1>
            
            {world?.name && (
              <p
                style={{
                  fontSize: '36px',
                  color: '#d1d5db',
                  margin: 0,
                  marginBottom: '16px',
                  textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
                }}
              >
                from {world.name}
              </p>
            )}
            
            <p
              style={{
                fontSize: '28px',
                color: '#9ca3af',
                margin: 0,
                textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
              }}
            >
              {config.websiteName}
            </p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630, // Standard OG image dimensions
      }
    );
  } catch (error) {
    logger.error('API', 'Error generating OC OG image', error);
    // Fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111827',
            color: '#ffffff',
            fontSize: '48px',
          }}
        >
          Character Not Found
        </div>
      ),
      {
        width: 1200,
        height: 1200,
      }
    );
  }
}

