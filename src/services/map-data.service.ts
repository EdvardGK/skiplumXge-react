// Map data service for fetching real building and property data from OpenStreetMap

interface OSMElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: {
    building?: string;
    'building:levels'?: string;
    height?: string;
    name?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'ref:bygningsnr'?: string;
    [key: string]: string | undefined;
  };
}

interface OSMResponse {
  elements: OSMElement[];
}

interface BuildingData {
  id: string;
  type: string;
  coordinates: [number, number][];
  area?: number;
  levels?: number;
  height?: number;
  name?: string;
  address?: string;
  bygningsnummer?: string;
  addressLabel?: string; // Short label like "S32" or "KJG32"
  category: 'target' | 'neighbor'; // target = from searched address, neighbor = nearby
  isSelected?: boolean; // Currently selected building
}

export class MapDataService {
  private static OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter', // Backup endpoint
  ];

  /**
   * Fetch the primary building at a specific address (for form pre-filling)
   * @param lat Latitude
   * @param lon Longitude
   * @param radius Small radius to find the specific building (default 25m)
   */
  static async fetchPrimaryBuilding(
    lat: number,
    lon: number,
    radius: number = 25
  ): Promise<BuildingData | null> {
    const buildings = await this.fetchNearbyBuildings(lat, lon, radius);

    if (buildings.length === 0) return null;

    // Find the closest building to the coordinates (likely the addressed building)
    let closestBuilding = buildings[0];
    let minDistance = Number.MAX_VALUE;

    buildings.forEach(building => {
      if (building.coordinates.length > 0) {
        // Calculate distance from center to building centroid
        const buildingLat = building.coordinates[0][0];
        const buildingLon = building.coordinates[0][1];
        const distance = Math.sqrt(
          Math.pow(buildingLat - lat, 2) + Math.pow(buildingLon - lon, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestBuilding = building;
        }
      }
    });

    return closestBuilding;
  }

  /**
   * Fetch buildings within radius of given coordinates using Overpass API
   * @param lat Latitude
   * @param lon Longitude
   * @param radius Radius in meters (default 100m)
   */
  static async fetchNearbyBuildings(
    lat: number,
    lon: number,
    radius: number = 100
  ): Promise<BuildingData[]> {
    // Overpass QL query to get buildings within radius
    const query = `
      [out:json][timeout:25];
      (
        way["building"](around:${radius},${lat},${lon});
        relation["building"]["type"="multipolygon"](around:${radius},${lat},${lon});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      // Try primary endpoint first
      const response = await this.executeOverpassQuery(query);
      return this.processBuildingData(response, lat, lon);
    } catch (error) {
      console.error('Failed to fetch building data:', error);
      return [];
    }
  }

  /**
   * Fetch buildings categorized by searched address vs neighbors
   * @param lat Latitude of searched address
   * @param lon Longitude of searched address
   * @param searchedAddress The address that was searched for
   * @param radius Radius in meters (default 100m)
   */
  static async fetchCategorizedBuildings(
    lat: number,
    lon: number,
    searchedAddress: string,
    radius: number = 100
  ): Promise<{ targetBuildings: BuildingData[], neighborBuildings: BuildingData[], selectedBuilding: BuildingData | null }> {
    const allBuildings = await this.fetchNearbyBuildings(lat, lon, radius);

    // Extract street name from searched address for matching
    const searchedStreet = this.extractStreetName(searchedAddress);
    const searchedHouseNumber = this.extractHouseNumber(searchedAddress);

    const targetBuildings: BuildingData[] = [];
    const neighborBuildings: BuildingData[] = [];
    let selectedBuilding: BuildingData | null = null;
    let closestTargetBuilding: BuildingData | null = null;
    let minDistance = Number.MAX_VALUE;

    allBuildings.forEach(building => {
      // Check if building matches the searched address
      const isFromSearchedAddress = this.isBuildingFromSearchedAddress(
        building,
        searchedStreet,
        searchedHouseNumber
      );

      if (isFromSearchedAddress) {
        building.category = 'target';
        targetBuildings.push(building);

        // Find closest target building as default selection
        const distance = this.calculateDistance(lat, lon, building.coordinates[0][0], building.coordinates[0][1]);
        if (distance < minDistance) {
          minDistance = distance;
          closestTargetBuilding = building;
        }
      } else {
        building.category = 'neighbor';
        neighborBuildings.push(building);
      }
    });

    // Set the closest target building as selected
    if (closestTargetBuilding) {
      (closestTargetBuilding as BuildingData).isSelected = true;
      selectedBuilding = closestTargetBuilding;
    }

    return {
      targetBuildings,
      neighborBuildings,
      selectedBuilding
    };
  }

  /**
   * Execute Overpass API query with fallback endpoints
   */
  private static async executeOverpassQuery(query: string): Promise<OSMResponse> {
    let lastError: Error | null = null;

    for (const endpoint of this.OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Failed to fetch from ${endpoint}:`, error);
        // Try next endpoint
      }
    }

    throw lastError || new Error('All Overpass endpoints failed');
  }

  /**
   * Process raw OSM data into building polygons
   */
  private static processBuildingData(response: OSMResponse, centerLat?: number, centerLon?: number): BuildingData[] {
    const buildings: BuildingData[] = [];
    const nodes = new Map<number, { lat: number; lon: number }>();

    // First pass: collect all nodes
    response.elements.forEach(element => {
      if (element.type === 'node' && element.lat && element.lon) {
        nodes.set(element.id, { lat: element.lat, lon: element.lon });
      }
    });

    // Second pass: build polygons from ways
    response.elements.forEach(element => {
      if (element.type === 'way' && element.tags?.building && element.nodes) {
        const coordinates: [number, number][] = [];

        // Convert node references to coordinates
        element.nodes.forEach(nodeId => {
          const node = nodes.get(nodeId);
          if (node) {
            coordinates.push([node.lat, node.lon]);
          }
        });

        if (coordinates.length >= 3) {
          // Ensure polygon is closed
          if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
              coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
            coordinates.push(coordinates[0]);
          }

          const building: BuildingData = {
            id: `osm-${element.id}`,
            type: this.getBuildingType(element.tags.building),
            coordinates,
            levels: element.tags['building:levels'] ?
              parseInt(element.tags['building:levels']) : undefined,
            height: element.tags.height ?
              parseFloat(element.tags.height) : undefined,
            name: element.tags.name,
            address: this.formatAddress(element.tags),
            bygningsnummer: element.tags['ref:bygningsnr'],
            addressLabel: this.createAddressLabel(element.tags),
            category: 'neighbor', // Default category, will be updated by fetchCategorizedBuildings
            isSelected: false,
          };

          // Estimate area from polygon (simplified)
          if (coordinates.length > 3) {
            building.area = this.estimatePolygonArea(coordinates);
          }

          buildings.push(building);
        }
      }
    });

    return buildings;
  }

  /**
   * Map OSM building types to Norwegian categories
   */
  private static getBuildingType(osmType: string): string {
    const typeMapping: { [key: string]: string } = {
      'office': 'Kontor',
      'commercial': 'Forretning',
      'residential': 'Bolig',
      'apartments': 'Flerbolig',
      'house': 'Småhus',
      'detached': 'Enebolig',
      'industrial': 'Industri',
      'warehouse': 'Lager',
      'retail': 'Butikk',
      'school': 'Skole',
      'hospital': 'Sykehus',
      'hotel': 'Hotell',
      'yes': 'Bygning', // Generic building
    };

    return typeMapping[osmType] || 'Bygning';
  }

  /**
   * Format address from OSM tags
   */
  private static formatAddress(tags: any): string | undefined {
    if (!tags) return undefined;

    const parts = [];
    if (tags['addr:street'] && tags['addr:housenumber']) {
      parts.push(`${tags['addr:street']} ${tags['addr:housenumber']}`);
    }
    if (tags['addr:postcode']) {
      parts.push(tags['addr:postcode']);
    }
    if (tags['addr:city']) {
      parts.push(tags['addr:city']);
    }

    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  /**
   * Create short address label from street and house number
   * Examples: "Storgata 32" -> "S32", "Karl Johans gate 1" -> "KJG1"
   */
  private static createAddressLabel(tags: any): string | undefined {
    if (!tags || !tags['addr:street'] || !tags['addr:housenumber']) {
      return undefined;
    }

    const street = tags['addr:street'];
    const houseNumber = tags['addr:housenumber'];

    // Split street name into words and extract initials
    const words = street
      .split(' ')
      .filter((word: string) => word.length > 0)
      .map((word: string) => word.charAt(0).toUpperCase());

    // Join initials with house number
    return words.join('') + houseNumber;
  }

  /**
   * Estimate polygon area using shoelace formula (simplified)
   * Returns approximate area in square meters
   */
  private static estimatePolygonArea(coordinates: [number, number][]): number {
    if (coordinates.length < 3) return 0;

    // Convert lat/lon to approximate meters (works for small areas)
    // At 60° latitude (Norway), 1 degree lat ≈ 111km, 1 degree lon ≈ 55km
    const latToMeters = 111000;
    const lonToMeters = 55000;

    let area = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const x1 = coordinates[i][1] * lonToMeters;
      const y1 = coordinates[i][0] * latToMeters;
      const x2 = coordinates[i + 1][1] * lonToMeters;
      const y2 = coordinates[i + 1][0] * latToMeters;

      area += (x1 * y2 - x2 * y1);
    }

    return Math.abs(area / 2);
  }

  /**
   * Fetch property boundaries (requires backend proxy to Kartverket)
   * This is a placeholder for future enhancement
   */
  static async fetchPropertyBoundaries(
    lat: number,
    lon: number
  ): Promise<[number, number][] | null> {
    // For now, we can try to find landuse=residential or boundary=administrative
    // areas in OSM as a fallback for property boundaries

    const query = `
      [out:json][timeout:10];
      (
        way["landuse"="residential"](around:50,${lat},${lon});
        way["boundary"="administrative"](around:100,${lat},${lon});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const response = await this.executeOverpassQuery(query);
      // Process and return first matching boundary
      // Implementation simplified for brevity
      return null;
    } catch (error) {
      console.warn('Could not fetch property boundaries:', error);
      return null;
    }
  }

  /**
   * Helper methods for building categorization
   */
  private static extractStreetName(address: string): string {
    // Extract street name from address (before house number)
    const parts = address.split(/\s+/);
    const streetParts = [];

    for (const part of parts) {
      if (/^\d+/.test(part)) {
        // Stop when we hit a number (house number)
        break;
      }
      streetParts.push(part);
    }

    return streetParts.join(' ').toLowerCase();
  }

  private static extractHouseNumber(address: string): string {
    // Extract house number from address
    const match = address.match(/\b(\d+\w?)\b/);
    return match ? match[1].toLowerCase() : '';
  }

  private static isBuildingFromSearchedAddress(
    building: BuildingData,
    searchedStreet: string,
    searchedHouseNumber: string
  ): boolean {
    if (!building.address) return false;

    const buildingStreet = this.extractStreetName(building.address);
    const buildingHouseNumber = this.extractHouseNumber(building.address);

    // Match street name (allowing for minor variations)
    const streetMatch = buildingStreet.includes(searchedStreet) ||
                       searchedStreet.includes(buildingStreet) ||
                       this.normalizeStreetName(buildingStreet) === this.normalizeStreetName(searchedStreet);

    // Match house number
    const houseNumberMatch = buildingHouseNumber === searchedHouseNumber;

    return streetMatch && (houseNumberMatch || !searchedHouseNumber);
  }

  private static normalizeStreetName(street: string): string {
    // Normalize Norwegian street names for better matching
    return street
      .toLowerCase()
      .replace(/gate$/, 'gt')
      .replace(/vei$/, 'v')
      .replace(/plass$/, 'pl')
      .replace(/\s+/g, '');
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Simple Euclidean distance for small areas
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
  }

  /**
   * Validate address using Kartverket (may need proxy for CORS)
   */
  static async validateAddress(query: string): Promise<any> {
    const kartverketUrl = `https://ws.geonorge.no/adresser/v1/sok?q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(kartverketUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      // If CORS fails, would need to use backend proxy
      console.warn('Direct Kartverket API failed (CORS?), need backend proxy:', error);

      // Fallback to backend proxy endpoint (when implemented)
      // return await fetch(`/api/address/search?q=${encodeURIComponent(query)}`);

      throw error;
    }
  }
}

export default MapDataService;