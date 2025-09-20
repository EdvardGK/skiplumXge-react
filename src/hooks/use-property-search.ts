import { useState, useCallback, useEffect, useRef } from 'react';
import { Address, KartverketResponse } from '@/types/norwegian-energy';

interface UsePropertySearchProps {
  debounceMs?: number;
  maxResults?: number;
}

interface UsePropertySearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: Address[];
  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;
  isLoading: boolean;
  error: string | null;
  clearResults: () => void;
  hasSelection: boolean;
  clearSearch: () => void;
}

// Fetch addresses from our Kartverket API route with abort support
const searchAddresses = async (query: string, signal: AbortSignal): Promise<Address[]> => {
  if (query.length < 3) return [];

  try {
    const response = await fetch(
      `/api/addresses/search?q=${encodeURIComponent(query)}&limit=10`,
      { signal }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to search addresses');
    }

    const data = await response.json();
    return data.addresses;
  } catch (error) {
    // Don't log abort errors - they're intentional
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    console.error('Address search error:', error);
    throw error;
  }
};

export const usePropertySearch = ({
  debounceMs = 200,
  maxResults = 10,
}: UsePropertySearchProps = {}): UsePropertySearchReturn => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [lastSelectedText, setLastSelectedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abort controller for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track search ID to ensure we only show results from the latest search
  const searchIdRef = useRef(0);

  // Track if current query matches a selection
  const hasSelection = selectedAddress !== null && query === lastSelectedText;

  // Update query and clear selection if text differs
  const handleSetQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);

    // Clear selection if user is typing something different
    if (selectedAddress && newQuery !== lastSelectedText) {
      setSelectedAddress(null);
      setLastSelectedText('');
    }
  }, [selectedAddress, lastSelectedText]);

  // Handle address selection
  const handleSetSelectedAddress = useCallback((address: Address | null) => {
    setSelectedAddress(address);
    if (address) {
      setLastSelectedText(address.adressetekst);
      setQuery(address.adressetekst);
    } else {
      setLastSelectedText('');
    }
  }, []);

  // Clear search completely
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedAddress(null);
    setLastSelectedText('');
    setError(null);
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Search when debounced query changes
  useEffect(() => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear results if query is too short or user has made a selection
    if (debouncedQuery.length < 3 || hasSelection) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Increment search ID for this new search
    searchIdRef.current += 1;
    const currentSearchId = searchIdRef.current;

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);

      console.log(`Starting search ${currentSearchId} for: "${debouncedQuery}"`);

      try {
        const addresses = await searchAddresses(debouncedQuery, abortController.signal);

        // Only update if this is still the latest search and wasn't aborted
        if (!abortController.signal.aborted && currentSearchId === searchIdRef.current) {
          console.log(`Updating results for search ${currentSearchId}: ${addresses.length} addresses found`);
          setResults(addresses.slice(0, maxResults));
          setIsLoading(false);
        } else {
          console.log(`Ignoring stale search ${currentSearchId} (current: ${searchIdRef.current})`);
        }
      } catch (err) {
        // Only show error if not aborted and this is still the current search
        if (!abortController.signal.aborted && currentSearchId === searchIdRef.current) {
          if (err instanceof Error && err.name !== 'AbortError') {
            setError(
              err instanceof Error ? err.message : 'Feil ved søk etter adresse'
            );
          }
          setResults([]);
          setIsLoading(false);
        }
      }
    };

    performSearch();

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [debouncedQuery, maxResults, hasSelection]);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setSelectedAddress(null);
    setLastSelectedText('');
    setError(null);
  }, []);

  return {
    query,
    setQuery: handleSetQuery,
    results,
    selectedAddress,
    setSelectedAddress: handleSetSelectedAddress,
    isLoading,
    error,
    clearResults,
    hasSelection,
    clearSearch,
  };
};