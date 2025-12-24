// useUNSPSC.js
import { useState, useEffect } from 'react';

export default function useUNSPSC() {
  const [codes, setCodes] = useState([]);
  useEffect(() => {
    // Fetch UNSPSC codes from API
    setCodes([]);
  }, []);
  return { codes };
}
