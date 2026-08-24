import type { Metadata, Viewport } from 'next';
import './dahon-egb.css';

export const metadata: Metadata = {
  title: 'Dahon Abre | The Verdant Remedy',
  description:
    'Character profile for Dahon Abre — plant doctor and proprietor of The Verdant Remedy in Evermere.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function DahonEgbLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        html:has(.dahon-egb),
        html:has(.dahon-egb) body {
          background: #e8f4e8 !important;
          color: #3d342c !important;
          font-family: "Nunito", sans-serif !important;
          color-scheme: light;
        }
        body:has(.dahon-egb) button.fixed.bottom-8 {
          display: none !important;
        }
      `}</style>
      <div className="dahon-egb" data-theme="atelier">
        {children}
      </div>
    </>
  );
}
