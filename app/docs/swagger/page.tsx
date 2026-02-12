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
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: 'monospace',
        color: '#666'
      }}>
        Loading API Documentation...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: 'monospace',
        color: '#c00'
      }}>
        <div>Error: {error}</div>
        <div style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
          API documentation unavailable
        </div>
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