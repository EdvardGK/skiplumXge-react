/**
 * Property Ownership Verification for Norwegian Properties
 *
 * This module provides functions to verify if a business owns a specific property
 * by cross-referencing data from Norwegian public registers.
 */

interface PropertyOwnershipCheck {
  organizationNumber: string;  // Norwegian org number (9 digits)
  gnr: string;                // Gårdsnummer
  bnr: string;                // Bruksnummer
  kommune: string;             // Municipality number
}

interface OwnershipResult {
  isOwner: boolean;
  ownerName?: string;
  ownerType?: 'person' | 'organization';
  verificationSource?: string;
  message?: string;
}

/**
 * Verify if a business owns a specific property
 *
 * Data sources we could use:
 * 1. Kartverket's Grunnboken API (requires authentication)
 * 2. Matrikkel API for property data
 * 3. Brønnøysundregistrene for business verification
 */
export async function verifyPropertyOwnership(
  check: PropertyOwnershipCheck
): Promise<OwnershipResult> {
  try {
    // Step 1: Validate the organization number with Brønnøysundregistrene
    const orgValid = await validateOrganization(check.organizationNumber);
    if (!orgValid) {
      return {
        isOwner: false,
        message: 'Ugyldig organisasjonsnummer'
      };
    }

    // Step 2: Get property ownership from Kartverket
    // NOTE: This would require API credentials and proper authentication
    const ownership = await getPropertyOwnership(
      check.gnr,
      check.bnr,
      check.kommune
    );

    // Step 3: Match organization number with property owner
    if (ownership.ownerOrgNumber === check.organizationNumber) {
      return {
        isOwner: true,
        ownerName: ownership.ownerName,
        ownerType: 'organization',
        verificationSource: 'Kartverket Grunnboken'
      };
    }

    return {
      isOwner: false,
      ownerName: ownership.ownerName,
      ownerType: ownership.ownerType,
      message: 'Organisasjonen er ikke registrert som eier av denne eiendommen'
    };

  } catch (error) {
    console.error('Property ownership verification failed:', error);
    return {
      isOwner: false,
      message: 'Kunne ikke verifisere eierskap'
    };
  }
}

/**
 * Validate organization number with Brønnøysundregistrene
 */
async function validateOrganization(orgNumber: string): Promise<boolean> {
  // Remove spaces and validate format
  const cleanOrgNumber = orgNumber.replace(/\s/g, '');
  if (!/^\d{9}$/.test(cleanOrgNumber)) {
    return false;
  }

  try {
    const response = await fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter/${cleanOrgNumber}`
    );
    return response.ok;
  } catch (error) {
    console.error('Organization validation failed:', error);
    return false;
  }
}

/**
 * Get property ownership from Kartverket
 * NOTE: This is a placeholder - actual implementation would require:
 * - API credentials from Kartverket
 * - Proper authentication (OAuth2 or API key)
 * - Handling of different response formats
 */
async function getPropertyOwnership(
  gnr: string,
  bnr: string,
  kommune: string
): Promise<any> {
  // Placeholder for actual Kartverket API call
  // Real implementation would look something like:
  /*
  const response = await fetch(
    `https://api.kartverket.no/grunnbok/v1/eiendom/${kommune}/${gnr}/${bnr}/eiere`,
    {
      headers: {
        'Authorization': `Bearer ${KARTVERKET_API_TOKEN}`,
        'Accept': 'application/json'
      }
    }
  );

  const data = await response.json();
  return {
    ownerOrgNumber: data.eiere[0]?.organisasjonsnummer,
    ownerName: data.eiere[0]?.navn,
    ownerType: data.eiere[0]?.type
  };
  */

  // For now, return mock data
  return {
    ownerOrgNumber: null,
    ownerName: 'Unknown',
    ownerType: 'unknown'
  };
}

/**
 * Alternative: Check using public Matrikkel data
 * This might have limited ownership information
 */
export async function checkMatrikkelData(
  gnr: string,
  bnr: string,
  kommunenr: string
): Promise<any> {
  try {
    // Matrikkel API endpoint (if available publicly)
    const response = await fetch(
      `https://ws.geonorge.no/eiendom/v1/kommuner/${kommunenr}/eiendommer?gnr=${gnr}&bnr=${bnr}`
    );

    if (response.ok) {
      const data = await response.json();
      // Extract whatever ownership info is available
      return data;
    }
  } catch (error) {
    console.error('Matrikkel lookup failed:', error);
  }

  return null;
}

/**
 * Simplified ownership check for the contact form
 * Could be called when a business provides their org number and property address
 */
export async function quickOwnershipCheck(
  orgNumber: string,
  propertyAddress: string
): Promise<boolean> {
  // This would:
  // 1. Parse the address to get gnr/bnr
  // 2. Look up the property ownership
  // 3. Compare with the provided org number

  // For now, we can at least validate the org number exists
  return await validateOrganization(orgNumber);
}

/**
 * Format organization number for display
 */
export function formatOrgNumber(orgNumber: string): string {
  const clean = orgNumber.replace(/\s/g, '');
  if (clean.length === 9) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return orgNumber;
}