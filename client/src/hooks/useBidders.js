// useBidders.js
import { useState, useEffect } from 'react';

export default function useBidders() {
  const [bidders, setBidders] = useState([]);
  useEffect(() => {
    // Fetch bidders from API
    setBidders([]);
  }, []);
  return { bidders };
}
