import { ImageResponse } from 'next/og';
import { getSiteConfig } from '@/lib/config/site-config';

export const runtime = 'edge';

export async function GET() {
  try {
    const config = await getSiteConfig();
    
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
            backgroundColor: config.backgroundColor || '#111827',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              textAlign: 'center',
              height: '100%',
              width: '100%',
            }}
          >
            <h1
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: '24px',
                textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
                lineHeight: '1.2',
              }}
            >
              {config.websiteName}
            </h1>
            <p
              style={{
                fontSize: '36px',
                color: '#d1d5db',
                maxWidth: '1000px',
                textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
                lineHeight: '1.4',
              }}
            >
              {config.websiteDescription}
            </p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    // Fallback to a simple image
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
          OC Encyclopedia
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}

