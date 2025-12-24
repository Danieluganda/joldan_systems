// useWorkplan.js
import { useState, useEffect } from 'react';

export default function useWorkplan() {
  const [workplans, setWorkplans] = useState([]);
  useEffect(() => {
    // Fetch workplans from API
    setWorkplans([]);
  }, []);
  return { workplans };
}
