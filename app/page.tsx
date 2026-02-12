export default function Home() {
  // Redirect to API health endpoint
  if (typeof window !== 'undefined') {
    window.location.href = '/api/health';
  }
  
  return null;
}

// This makes Next.js treat this as a static page that redirects
export const dynamic = 'force-static';
