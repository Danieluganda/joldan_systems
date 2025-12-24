// useStages.js
import { useState, useEffect } from 'react';

export default function useStages() {
  const [stages, setStages] = useState([]);
  useEffect(() => {
    // Fetch stages from API
    setStages([]);
  }, []);
  return { stages };
}
