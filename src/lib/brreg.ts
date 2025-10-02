/**
 * Brønnøysundregistrene (BRREG) API Integration
 *
 * Official Norwegian business register API for organization lookups.
 * API Documentation: https://data.brreg.no/enhetsregisteret/api/dokumentasjon/en/index.html
 */

const BRREG_API_BASE = 'https://data.brreg.no/enhetsregisteret/api';

/**
 * Organization data from BRREG Enhetsregisteret
 */
export interface BrregOrganization {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: {
    kode: string;
    beskrivelse: string;
  };
  forretningsadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
    kommune?: string;
    land?: string;
  };
  postadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
    kommune?: string;
    land?: string;
  };
  registreringsdatoEnhetsregisteret?: string;
  naeringskode1?: {
    kode: string;
    beskrivelse: string;
  };
  hjemmeside?: string;
  konkurs?: boolean;
  underAvvikling?: boolean;
  underTvangsavviklingEllerTvangsopplosning?: boolean;
}

/**
 * Simplified organization info for UI display
 */
export interface OrganizationInfo {
  organizationNumber: string;
  name: string;
  organizationType?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  municipality?: string;
  registrationDate?: string;
  website?: string;
  isActive: boolean;
}

/**
 * Fetch organization data from BRREG by organization number
 *
 * @param orgNumber - 9-digit Norwegian organization number
 * @returns Organization information or null if not found
 *
 * @example
 * const org = await fetchOrganization('123456789');
 * if (org) {
 *   console.log(org.name); // "Acme AS"
 * }
 */
export async function fetchOrganization(
  orgNumber: string
): Promise<OrganizationInfo | null> {
  // Clean org number (remove spaces and non-digits)
  const cleanNumber = orgNumber.replace(/\D/g, '');

  // Validate 9-digit format
  if (cleanNumber.length !== 9) {
    console.warn(`Invalid organization number format: ${orgNumber}`);
    return null;
  }

  try {
    const response = await fetch(`${BRREG_API_BASE}/enheter/${cleanNumber}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Organization not found: ${cleanNumber}`);
        return null;
      }
      throw new Error(`BRREG API error: ${response.status}`);
    }

    const data: BrregOrganization = await response.json();

    // Transform to simplified format
    const address = data.forretningsadresse || data.postadresse;
    const isActive = !(
      data.konkurs ||
      data.underAvvikling ||
      data.underTvangsavviklingEllerTvangsopplosning
    );

    return {
      organizationNumber: data.organisasjonsnummer,
      name: data.navn,
      organizationType: data.organisasjonsform?.beskrivelse,
      address: address?.adresse?.join(', '),
      postalCode: address?.postnummer,
      city: address?.poststed,
      municipality: address?.kommune,
      registrationDate: data.registreringsdatoEnhetsregisteret,
      website: data.hjemmeside,
      isActive,
    };
  } catch (error) {
    console.error('Failed to fetch organization from BRREG:', error);
    return null;
  }
}

/**
 * Format organization number with spaces for display
 * 123456789 → 123 456 789
 */
export function formatOrgNumber(orgNumber: string): string {
  const clean = orgNumber.replace(/\D/g, '');
  if (clean.length !== 9) return orgNumber;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
}

/**
 * Validate organization number format (basic check)
 */
export function isValidOrgNumber(orgNumber: string): boolean {
  const clean = orgNumber.replace(/\D/g, '');
  return clean.length === 9;
}

/**
 * Get organization display name with type
 * "Acme AS (Aksjeselskap)" or just "Acme AS" if no type
 */
export function getOrganizationDisplayName(org: OrganizationInfo): string {
  if (org.organizationType) {
    return `${org.name} (${org.organizationType})`;
  }
  return org.name;
}
