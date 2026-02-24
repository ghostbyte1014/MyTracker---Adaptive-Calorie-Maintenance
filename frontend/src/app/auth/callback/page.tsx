'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your sign-in...');

  useEffect(() => {
    // Get token from URL query params (for redirect flow)
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const tokenType = params.get('token_type');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Sign-in failed: ${error}`);
      setTimeout(() => router.push('/?error=oauth_failed'), 3000);
      return;
    }

    if (accessToken && tokenType === 'bearer') {
      // Store the token
      api.setToken(accessToken);
      setStatus('success');
      setMessage('Sign-in successful! Redirecting...');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => router.push('/dashboard'), 1000);
    } else {
      // No token in URL - try to check if there's a session
      setStatus('error');
      setMessage('No authentication token received');
      setTimeout(() => router.push('/?error=no_token'), 3000);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-600 font-medium">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <p className="text-red-600 font-medium">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
