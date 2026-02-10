'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import SwaggerUI to avoid SSR issues
// @ts-expect-error - swagger-ui-react doesn't have TypeScript definitions
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerSpec {
  [key: string]: unknown;
}

export default function SwaggerPage() {
  const [spec, setSpec] = useState<SwaggerSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load the swagger spec from the API endpoint
    fetch('/api/docs/swagger-json')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load Swagger specification');
        }
        return res.json();
      })
      .then((json) => {
        // Override servers to use current origin (fixes CORS)
        if (typeof window !== 'undefined') {
          json.servers = [
            {
              url: window.location.origin,
              description: 'Current Server'
            }
          ];
        }
        setSpec(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Loading Swagger Documentation...</h1>
        <p>Please wait...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Error Loading Documentation</h1>
        <p>{error}</p>
        <p style={{ marginTop: '20px', color: '#666' }}>
          Make sure the swagger.yaml file exists at docs/swagger.yaml
        </p>
      </div>
    );
  }

  if (!spec) {
    return null;
  }

  return (
    <div style={{ height: '100vh', overflow: 'auto' }}>
      {/* @ts-expect-error - swagger-ui-react doesn't have TypeScript definitions */}
      <SwaggerUI spec={spec} />
    </div>
  );
}