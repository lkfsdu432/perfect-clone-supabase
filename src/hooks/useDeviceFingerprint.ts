import { useState, useEffect, useCallback } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const FINGERPRINT_STORAGE_KEY = 'device_fingerprint';

export const useDeviceFingerprint = () => {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initFingerprint = async () => {
      try {
        // Check if we have a stored fingerprint
        const storedFingerprint = localStorage.getItem(FINGERPRINT_STORAGE_KEY);
        
        if (storedFingerprint) {
          setFingerprint(storedFingerprint);
          setIsLoading(false);
          return;
        }

        // Generate new fingerprint
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const visitorId = result.visitorId;

        // Store fingerprint
        localStorage.setItem(FINGERPRINT_STORAGE_KEY, visitorId);
        setFingerprint(visitorId);
      } catch (error) {
        console.error('Error generating fingerprint:', error);
        // Fallback: generate a random ID if fingerprint fails
        const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem(FINGERPRINT_STORAGE_KEY, fallbackId);
        setFingerprint(fallbackId);
      } finally {
        setIsLoading(false);
      }
    };

    initFingerprint();
  }, []);

  const getFingerprint = useCallback(() => {
    return fingerprint || localStorage.getItem(FINGERPRINT_STORAGE_KEY);
  }, [fingerprint]);

  return { fingerprint, isLoading, getFingerprint };
};

export default useDeviceFingerprint;
