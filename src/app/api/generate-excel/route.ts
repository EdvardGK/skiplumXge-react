import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    // For now, we'll create a simple JSON structure that mimics the Excel form
    // In a real implementation, you would use a library like exceljs or xlsx
    // to generate an actual Excel file with the proper formatting

    const excelStructure = {
      sheets: {
        "Kartlegging": {
          "Generelt": {
            "Gårdsnummer(gnr.)": formData.gnr || "",
            "Bruksnummer(bnr.)": formData.bnr || "",
            "Festenummer(fnr.)": formData.fnr || "",
            "Seksjonsnummer(snr.)": formData.snr || "",
            "Kommunenummer(knr.)": formData.kommunenummer || "",
            "Bygningstype/bruksformål(NS 3457-3)": formData.bygningstype || "",
            "Bygningssoner(NS 3457-6)": formData.bygningssoner || "",
            "Bygningsvolum(bra.)": formData.bygningsvolum || "",
            "Bruksareal(bpa.)": formData.bruksareal || "",
            "Oppføringsår": formData.oppforingsaar || "",
            "FDV-dokumentasjon": formData.fdvDokumentasjon || "",
            "Energimerking(A-G)": formData.energimerking || ""
          },
          "Faktisk energibruk og driftsprofil": {
            "Total": formData.totalEnergibruk || "",
            "Bygningssone 1(NS 3457-6)": formData.bygningssone1 || "",
            "Bygningssone 2(NS 3457-6)": formData.bygningssone2 || "",
            "Bygningssone 3(NS 3457-6)": formData.bygningssone3 || ""
          }
        },
        "Energikartlegging - komprimert": {
          "Bygningskropp og bygningsdeler": {
            "Yttervegger(233)": {
              "Type isolasjon": formData.ytterveggerIsolasjon || "",
              "Tykkelse": formData.ytterveggerTykkelse || ""
            },
            "Yttertak(221)": {
              "Type isolasjon": formData.yttertakIsolasjon || "",
              "Tykkelse": formData.yttertakTykkelse || ""
            },
            "Innertak(222)": {
              "Type isolasjon": formData.innertakIsolasjon || "",
              "Tykkelse": formData.innertakTykkelse || ""
            },
            "Gulv mot grunn": {
              "Type isolasjon": formData.gulvIsolasjon || "",
              "Tykkelse": formData.gulvTykkelse || ""
            },
            "Vinduselementer(231)": {
              "Antall": formData.vinduAntall || "",
              "Type": formData.vinduType || "",
              "Fra år": formData.vinduAar || ""
            }
          },
          "Tekniske anlegg": {
            "Varmtvannsproduksjon": {
              "Type": formData.varmtvannsType || ""
            },
            "Ventilasjonsystem": {
              "Type": formData.ventilasjonsType || ""
            },
            "Oppvarmingssystem": {
              "Type": formData.oppvarmingsType || ""
            },
            "Kjølesystem": {
              "Type": formData.kjolesystemType || ""
            },
            "Belysning": {
              "Type": formData.belysningType || "",
              "Antall": formData.belysningAntall || ""
            },
            "Regulering, overvåkning og styring": {
              "Termostater": formData.termostater || "",
              "SD-anlegg": formData.sdAnlegg || "",
              "Behovsstyring": formData.behovsstyring || ""
            }
          }
        }
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "SkiplumXGE Energianalyse",
        format: "Norwegian Energy Assessment (Energikartlegging)"
      }
    };

    // Convert to JSON string for download
    const jsonString = JSON.stringify(excelStructure, null, 2);

    // Create response with proper headers for file download
    const response = new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="energikartlegging-data.json"',
        'Access-Control-Allow-Origin': '*',
      },
    });

    return response;

  } catch (error) {
    console.error('Error generating Excel:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}