import { renderHook, act, waitFor } from '@testing-library/react';
import { usePropertySearch } from '../use-property-search';

describe('usePropertySearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => usePropertySearch());

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.selectedAddress).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not search for queries shorter than 3 characters', async () => {
    const { result } = renderHook(() => usePropertySearch({ debounceMs: 0 }));

    act(() => {
      result.current.setQuery('Ka');
    });

    await waitFor(() => {
      expect(result.current.results).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('searches for addresses when query is 3+ characters', async () => {
    const { result } = renderHook(() => usePropertySearch({ debounceMs: 0 }));

    act(() => {
      result.current.setQuery('Karl');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.results.length).toBeGreaterThan(0);
      expect(result.current.results[0].adressetekst).toContain('Karl Johans gate');
    });
  });

  it('debounces search queries', async () => {
    const { result } = renderHook(() => usePropertySearch({ debounceMs: 100 }));

    act(() => {
      result.current.setQuery('K');
    });

    act(() => {
      result.current.setQuery('Ka');
    });

    act(() => {
      result.current.setQuery('Karl');
    });

    // Should not trigger search immediately
    expect(result.current.isLoading).toBe(false);

    // Wait for debounce
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(true);
      },
      { timeout: 200 }
    );

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0);
    });
  });

  it('limits results to maxResults', async () => {
    const { result } = renderHook(() =>
      usePropertySearch({ debounceMs: 0, maxResults: 1 })
    );

    act(() => {
      result.current.setQuery('Oslo');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.results.length).toBeLessThanOrEqual(1);
    });
  });

  it('clears results when clearResults is called', async () => {
    const { result } = renderHook(() => usePropertySearch({ debounceMs: 0 }));

    act(() => {
      result.current.setQuery('Karl');
    });

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.selectedAddress).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets and clears selected address', () => {
    const { result } = renderHook(() => usePropertySearch());

    const mockAddress = {
      adressetekst: 'Test Address',
      coordinates: { lat: 59.9139, lon: 10.7522 },
      municipality: 'Oslo',
      postalCode: '0154',
    };

    act(() => {
      result.current.setSelectedAddress(mockAddress);
    });

    expect(result.current.selectedAddress).toEqual(mockAddress);

    act(() => {
      result.current.setSelectedAddress(null);
    });

    expect(result.current.selectedAddress).toBeNull();
  });
});