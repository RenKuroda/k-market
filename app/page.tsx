'use client';

import React from 'react';
import App from '../App';

export default function HomePage() {
  return (
    <React.Suspense fallback={null}>
      <App />
    </React.Suspense>
  );
}


