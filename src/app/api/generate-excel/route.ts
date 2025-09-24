import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = 'SkiplumXGE Energianalyse';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add the first sheet: "Kartlegging"
    const kartleggingSheet = workbook.addWorksheet('Kartlegging', {
      properties: { tabColor: { argb: '00B050' } }
    });

    // Define the data structure for Kartlegging sheet
    const kartleggingData = [
      // Headers and section titles
      ['ENERGIKARTLEGGING - GENERELT'],
      [''],
      ['Eiendomsinformasjon'],
      ['Gårdsnummer (gnr.)', formData.gnr || ''],
      ['Bruksnummer (bnr.)', formData.bnr || ''],
      ['Festenummer (fnr.)', formData.fnr || ''],
      ['Seksjonsnummer (snr.)', formData.snr || ''],
      ['Kommunenummer (knr.)', formData.kommunenummer || ''],
      [''],
      ['Bygningsinformasjon'],
      ['Bygningstype/bruksformål (NS 3457-3)', formData.bygningstype || ''],
      ['Bygningssoner (NS 3457-6)', formData.bygningssoner || ''],
      ['Bygningsvolum (BRA)', formData.bygningsvolum || ''],
      ['Bruksareal (BPA)', formData.bruksareal || ''],
      ['Oppføringsår', formData.oppforingsaar || ''],
      ['FDV-dokumentasjon', formData.fdvDokumentasjon || ''],
      ['Energimerking (A-G)', formData.energimerking || ''],
      [''],
      ['Faktisk energibruk og driftsprofil'],
      ['Total energibruk', formData.totalEnergibruk || ''],
      ['Bygningssone 1 (NS 3457-6)', formData.bygningssone1 || ''],
      ['Bygningssone 2 (NS 3457-6)', formData.bygningssone2 || ''],
      ['Bygningssone 3 (NS 3457-6)', formData.bygningssone3 || ''],
    ];

    // Add data to sheet
    kartleggingSheet.addRows(kartleggingData);

    // Format the sheet
    kartleggingSheet.getColumn(1).width = 40;
    kartleggingSheet.getColumn(2).width = 30;

    // Style the headers
    kartleggingSheet.getRow(1).font = { bold: true, size: 14 };
    kartleggingSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    };

    // Style section headers
    [3, 10, 19].forEach(rowNum => {
      const row = kartleggingSheet.getRow(rowNum);
      row.font = { bold: true, size: 12 };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    });

    // Add borders to data cells
    kartleggingSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3 && row.getCell(2).value) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    // Add the second sheet: "Tekniske anlegg"
    const tekniskSheet = workbook.addWorksheet('Tekniske anlegg', {
      properties: { tabColor: { argb: '0070C0' } }
    });

    const tekniskData = [
      ['TEKNISKE ANLEGG OG BYGNINGSDELER'],
      [''],
      ['Bygningskropp og bygningsdeler'],
      [''],
      ['Yttervegger (233)'],
      ['Type isolasjon', formData.ytterveggerIsolasjon || ''],
      ['Tykkelse (mm)', formData.ytterveggerTykkelse || ''],
      [''],
      ['Yttertak (221)'],
      ['Type isolasjon', formData.yttertakIsolasjon || ''],
      ['Tykkelse (mm)', formData.yttertakTykkelse || ''],
      [''],
      ['Innertak (222)'],
      ['Type isolasjon', formData.innertakIsolasjon || ''],
      ['Tykkelse (mm)', formData.innertakTykkelse || ''],
      [''],
      ['Gulv mot grunn'],
      ['Type isolasjon', formData.gulvIsolasjon || ''],
      ['Tykkelse (mm)', formData.gulvTykkelse || ''],
      [''],
      ['Vinduselementer (231)'],
      ['Antall', formData.vinduAntall || ''],
      ['Type', formData.vinduType || ''],
      ['Fra år', formData.vinduAar || ''],
      [''],
      ['Tekniske systemer'],
      [''],
      ['Varmtvannsproduksjon', formData.varmtvannsType || ''],
      ['Ventilasjonsystem', formData.ventilasjonsType || ''],
      ['Oppvarmingssystem', formData.oppvarmingsType || ''],
      ['Kjølesystem', formData.kjolesystemType || ''],
      [''],
      ['Belysning'],
      ['Type', formData.belysningType || ''],
      ['Antall', formData.belysningAntall || ''],
      [''],
      ['Regulering, overvåkning og styring'],
      ['Termostater', formData.termostater || ''],
      ['SD-anlegg', formData.sdAnlegg || ''],
      ['Behovsstyring', formData.behovsstyring || ''],
    ];

    tekniskSheet.addRows(tekniskData);

    // Format the teknisk sheet
    tekniskSheet.getColumn(1).width = 40;
    tekniskSheet.getColumn(2).width = 30;

    tekniskSheet.getRow(1).font = { bold: true, size: 14 };
    tekniskSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    };

    // Style section headers
    [3, 5, 9, 13, 17, 21, 26, 33, 37].forEach(rowNum => {
      const row = tekniskSheet.getRow(rowNum);
      row.font = { bold: true, size: 11 };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    });

    // Add borders to data cells
    tekniskSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3 && row.getCell(2).value) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Create response with proper headers for Excel file download
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="energikartlegging_${new Date().toISOString().split('T')[0]}.xlsx"`,
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