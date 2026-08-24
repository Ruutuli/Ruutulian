'use client';

import { useState } from 'react';

export function ShopProductImage({
  name,
  image,
  imageFile,
  categoryLabel,
}: {
  name: string;
  image: string;
  imageFile: string | null;
  categoryLabel: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="shop-product-visual">
        <div className="shop-product-placeholder">
          <span>{categoryLabel}</span>
          {imageFile ? <small>{imageFile}</small> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="shop-product-visual">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={name} onError={() => setFailed(true)} />
    </div>
  );
}
