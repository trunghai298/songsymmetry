'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

/**
 * Client component that initializes the user in the database
 * after successful authentication
 */
export default function UserInitializer() {
  const { data: session, status } = useSession();
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    // Only attempt to initialize if authenticated and not already initialized
    if (status === 'authenticated' && session?.user && !initialized) {
      // Call the user API to create/update the user in the database
      fetch('/api/user', {
        method: 'POST',
      })
        .then(response => {
          if (response.ok) {
            setInitialized(true);
            console.log('User data initialized in database');
          } else {
            console.error('Failed to initialize user data');
          }
        })
        .catch(error => {
          console.error('Error initializing user data:', error);
        });
    }
  }, [session, status, initialized]);
  
  // This component doesn't render anything
  return null;
}