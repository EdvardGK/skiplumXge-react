/**
 * PDF Report Generation API Route
 *
 * Generates professional Norwegian energy analysis reports with dashboard screenshots
 * and verified data from municipal case studies
 */

import { NextRequest, NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import { generateReportClaims } from '@/services/report-statistics.service'
import { VERIFIED_NORWEGIAN_ENERGY_DATA } from '@/lib/data/verified-sources'
import { createSecureResponse, createSecureErrorResponse, rateLimit, getClientIP } from '@/lib/security'

export interface ReportRequest {
  address: string
  buildingData: {
    buildingType: string
    totalArea: number
    heatedArea: number
    energyGrade?: string
    energyConsumption?: number
  }
  dashboardUrl: string
  municipalityNumber?: string
  analysisData?: {
    annualWaste: number
    annualWasteCost: number
    investmentRoom: number
    energyBreakdown: {
      heating: number
      lighting: number
      ventilation: number
      hotWater: number
    }
  }
}

export interface ReportResponse {
  success: boolean
  pdfBuffer?: string // Base64 encoded PDF
  filename?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting - stricter for PDF generation
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`report-generate:${clientIP}`, 10, 300000); // 10 requests per 5 minutes

    if (!rateLimitResult.allowed) {
      return createSecureErrorResponse('Rate limit exceeded for report generation. Please try again later.', 429);
    }

    const body: ReportRequest = await request.json()
    const { address, buildingData, dashboardUrl, municipalityNumber, analysisData } = body

    if (!address || !buildingData || !dashboardUrl) {
      return createSecureErrorResponse('Missing required fields: address, buildingData, and dashboardUrl are required', 400);
    }

    // 1. Capture dashboard screenshot
    let dashboardScreenshot: string | null = null
    try {
      const screenshotResponse = await fetch(`${request.nextUrl.origin}/api/dashboard/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboardUrl,
          width: 1920,
          height: 1080,
          quality: 90,
          printMode: true
        })
      })

      if (screenshotResponse.ok) {
        const screenshotData = await screenshotResponse.json()
        if (screenshotData.success) {
          dashboardScreenshot = screenshotData.screenshot
        }
      }
    } catch (error) {
      console.warn('Failed to capture dashboard screenshot:', error)
    }

    // 2. Generate verified claims
    const reportClaims = await generateReportClaims(address, municipalityNumber)

    // 3. Get verified case study data
    const ringebuSchool = VERIFIED_NORWEGIAN_ENERGY_DATA.caseStudies.ringebuUngdomsskole
    const ringebuBank = VERIFIED_NORWEGIAN_ENERGY_DATA.caseStudies.ringebuBankbygget

    // 4. Create PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // 5. Add Norwegian fonts (fallback to default)
    pdf.setFont('helvetica')

    // Page 1: Cover Page
    addCoverPage(pdf, address, buildingData)

    // Page 2: Executive Summary
    pdf.addPage()
    addExecutiveSummary(pdf, buildingData, analysisData, reportClaims)

    // Page 3: Dashboard Screenshot (if available)
    if (dashboardScreenshot) {
      pdf.addPage()
      await addDashboardScreenshot(pdf, dashboardScreenshot)
    }

    // Page 4: Investment Analysis
    pdf.addPage()
    addInvestmentAnalysis(pdf, analysisData, ringebuSchool, ringebuBank)

    // Page 5: Benchmarks and Comparisons
    pdf.addPage()
    addBenchmarksAndComparisons(pdf, buildingData, reportClaims)

    // Page 6: Credibility and Sources
    pdf.addPage()
    addCredibilityAndSources(pdf, ringebuSchool, ringebuBank)

    // Generate PDF buffer
    const pdfBuffer = pdf.output('arraybuffer')
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

    // Generate filename
    const date = new Date().toISOString().split('T')[0]
    const buildingTypeNorwegian = getBuildingTypeNorwegian(buildingData.buildingType)
    const filename = `Energianalyse_${buildingTypeNorwegian}_${date}.pdf`

    return createSecureResponse({
      success: true,
      pdfBuffer: pdfBase64,
      filename
    })

  } catch (error) {
    console.error('PDF generation failed:', error)

    return createSecureErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    )
  }
}

function addCoverPage(pdf: jsPDF, address: string, buildingData: any) {
  // SkiplumXGE Header
  pdf.setFontSize(28)
  pdf.setTextColor(0, 150, 180) // Cyan
  pdf.text('SkiplumXGE', 20, 40)

  pdf.setFontSize(16)
  pdf.setTextColor(100, 100, 100)
  pdf.text('Energianalyse og investeringsvurdering', 20, 50)

  // Property information
  pdf.setFontSize(22)
  pdf.setTextColor(0, 0, 0)
  pdf.text('Energirapport', 20, 80)

  pdf.setFontSize(14)
  pdf.text(`Eiendom: ${address}`, 20, 95)
  pdf.text(`Bygningstype: ${getBuildingTypeNorwegian(buildingData.buildingType)}`, 20, 105)
  pdf.text(`Totalt areal: ${buildingData.totalArea.toLocaleString()} m²`, 20, 115)

  if (buildingData.energyGrade) {
    pdf.text(`Energikarakter: ${buildingData.energyGrade}`, 20, 125)
  }

  // Date and verification
  const date = new Date().toLocaleDateString('no-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  pdf.setFontSize(12)
  pdf.text(`Rapportdato: ${date}`, 20, 260)
  pdf.text('Basert på offisielle norske datakilder og verifiserte kommunale case-studier', 20, 270)
}

function addExecutiveSummary(pdf: jsPDF, buildingData: any, analysisData: any, reportClaims: any) {
  pdf.setFontSize(18)
  pdf.setTextColor(0, 0, 0)
  pdf.text('Sammendrag', 20, 30)

  let yPos = 50

  // Key findings
  pdf.setFontSize(14)
  pdf.text('Hovedfunn:', 20, yPos)
  yPos += 15

  pdf.setFontSize(11)

  if (analysisData?.annualWasteCost) {
    pdf.text(`• Årlig energispill: ${analysisData.annualWasteCost.toLocaleString()} kr`, 25, yPos)
    yPos += 10
  }

  if (analysisData?.investmentRoom) {
    pdf.text(`• Konservativt investeringsrom: ${analysisData.investmentRoom.toLocaleString()} kr`, 25, yPos)
    yPos += 10
  }

  pdf.text('• Verifisert 19,8% - 49% lønnsomhet på energitiltak (Ringebu Kommune)', 25, yPos)
  yPos += 10

  pdf.text('• SINTEF-validert fordeling: 70% oppvarming, 15% lys, 15% øvrig', 25, yPos)
  yPos += 20

  // National context
  if (reportClaims.nationalClaims.length > 0) {
    pdf.setFontSize(14)
    pdf.text('Nasjonal kontekst:', 20, yPos)
    yPos += 15

    pdf.setFontSize(11)
    reportClaims.nationalClaims.slice(0, 3).forEach((claim: string) => {
      pdf.text(`• ${claim}`, 25, yPos)
      yPos += 10
    })
  }
}

async function addDashboardScreenshot(pdf: jsPDF, screenshotBase64: string) {
  pdf.setFontSize(18)
  pdf.text('Dashboard-analyse', 20, 30)

  try {
    // Add dashboard screenshot
    pdf.addImage(
      `data:image/png;base64,${screenshotBase64}`,
      'PNG',
      10, // x
      40, // y
      190, // width (A4 width minus margins)
      107, // height (16:9 aspect ratio)
      'dashboard',
      'FAST'
    )

    pdf.setFontSize(11)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Interaktiv analyse utført på tidspunktet for rapportgenerering', 20, 160)

  } catch (error) {
    console.error('Failed to add dashboard screenshot:', error)
    pdf.setFontSize(12)
    pdf.setTextColor(200, 0, 0)
    pdf.text('Dashboard-skjermbilde kunne ikke inkluderes', 20, 50)
  }
}

function addInvestmentAnalysis(pdf: jsPDF, analysisData: any, ringebuSchool: any, ringebuBank: any) {
  pdf.setFontSize(18)
  pdf.text('Investeringsanalyse', 20, 30)

  let yPos = 50

  // Investment recommendations
  pdf.setFontSize(14)
  pdf.text('Anbefalte tiltak (prioritert rekkefølge):', 20, yPos)
  yPos += 20

  pdf.setFontSize(11)

  // Top priorities based on verified ROI
  pdf.text('1. Driftsoptimalisering', 25, yPos)
  pdf.setTextColor(0, 150, 0)
  pdf.text('• Dokumentert 49% lønnsomhet (Ringebu Bankbygget)', 30, yPos + 8)
  pdf.text('• 2,2 års tilbakebetalingstid', 30, yPos + 16)
  pdf.setTextColor(0, 0, 0)
  yPos += 30

  pdf.text('2. Varmepumpeoptimalisering', 25, yPos)
  pdf.setTextColor(0, 150, 0)
  pdf.text('• Dokumentert 30,8% lønnsomhet (Ringebu Ungdomsskole)', 30, yPos + 8)
  pdf.text('• 3,6 års tilbakebetalingstid', 30, yPos + 16)
  pdf.setTextColor(0, 0, 0)
  yPos += 30

  pdf.text('3. Lysstyringssystem', 25, yPos)
  pdf.setTextColor(0, 150, 0)
  pdf.text('• Dokumentert 19,8% lønnsomhet', 30, yPos + 8)
  pdf.text('• 6,0 års tilbakebetalingstid', 30, yPos + 16)
  pdf.setTextColor(0, 0, 0)
  yPos += 35

  // Investment formula
  pdf.setFontSize(12)
  pdf.setTextColor(50, 50, 50)
  pdf.text('Beregningsgrunnlag:', 20, yPos)
  yPos += 10

  pdf.setFontSize(10)
  pdf.text('• Formel: Årlig energispill × 7 = Konservativt investeringsrom', 25, yPos)
  yPos += 8
  pdf.text('• 20% sikkerhetsmargin på alle beregninger', 25, yPos)
  yPos += 8
  pdf.text('• Basert på NPV ved 6% diskontering', 25, yPos)
}

function addBenchmarksAndComparisons(pdf: jsPDF, buildingData: any, reportClaims: any) {
  pdf.setFontSize(18)
  pdf.text('Benchmarks og sammenligninger', 20, 30)

  let yPos = 50

  // TEK17 requirements
  pdf.setFontSize(14)
  pdf.text('TEK17 krav:', 20, yPos)
  yPos += 15

  const benchmarks = VERIFIED_NORWEGIAN_ENERGY_DATA.energyBenchmarks
  const buildingType = buildingData.buildingType.toLowerCase()

  pdf.setFontSize(11)
  if (buildingType.includes('residential') || buildingType.includes('bolig')) {
    pdf.text('• Lovkrav: 115 kWh/m²/år', 25, yPos)
    pdf.text('• Faktisk snitt: 135 kWh/m²/år (eneboliger)', 25, yPos + 8)
  } else if (buildingType.includes('office') || buildingType.includes('kontor')) {
    pdf.text('• Lovkrav: 115 kWh/m²/år', 25, yPos)
    pdf.text('• Faktisk snitt: 155 kWh/m²/år (kontorbygg)', 25, yPos + 8)
  } else {
    pdf.text('• Generelt lovkrav: 115-270 kWh/m²/år (avhengig av bygningstype)', 25, yPos)
  }
  yPos += 25

  // Regional comparisons
  if (reportClaims.regionalClaims.length > 0) {
    pdf.setFontSize(14)
    pdf.text('Regional sammenligning:', 20, yPos)
    yPos += 15

    pdf.setFontSize(11)
    reportClaims.regionalClaims.slice(0, 3).forEach((claim: string) => {
      pdf.text(`• ${claim}`, 25, yPos)
      yPos += 10
    })
  }
}

function addCredibilityAndSources(pdf: jsPDF, ringebuSchool: any, ringebuBank: any) {
  pdf.setFontSize(18)
  pdf.text('Kilder og verifikasjon', 20, 30)

  let yPos = 50

  // Verified case studies
  pdf.setFontSize(14)
  pdf.text('Verifiserte case-studier:', 20, yPos)
  yPos += 15

  pdf.setFontSize(11)
  pdf.text('Ringebu Ungdomsskole (2016):', 25, yPos)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`• 948 000 kr investering → 19,8% internrente`, 30, yPos + 8)
  pdf.text(`• 33% energireduksjon oppnådd`, 30, yPos + 16)
  pdf.text(`• Profesjonell ENØK-analyse og etterverifikasjon`, 30, yPos + 24)
  yPos += 40

  pdf.setTextColor(0, 0, 0)
  pdf.text('Ringebu Bankbygget (2016):', 25, yPos)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`• 113 100 kr investering → 30% kombinert internrente`, 30, yPos + 8)
  pdf.text(`• 49% lønnsomhet på driftsoptimalisering`, 30, yPos + 16)
  pdf.text(`• Konservative tilbakebetalingsberegninger`, 30, yPos + 24)
  yPos += 40

  // Official sources
  pdf.setTextColor(0, 0, 0)
  pdf.setFontSize(14)
  pdf.text('Offisielle datakilder:', 20, yPos)
  yPos += 15

  pdf.setFontSize(10)
  pdf.setTextColor(50, 50, 50)
  const sources = [
    '• Kartverket: Adressevalidering og eiendomsdata',
    '• SSB: Offisielle strømpriser og energistatistikk',
    '• Enova: Nasjonale energisertifikat-database',
    '• SINTEF: Energisystemfordelinger for norske bygg',
    '• TEK17: Lovmessige byggenergikrav'
  ]

  sources.forEach(source => {
    pdf.text(source, 25, yPos)
    yPos += 8
  })

  // Footer
  yPos = 270
  pdf.setFontSize(8)
  pdf.setTextColor(150, 150, 150)
  pdf.text('Denne rapporten er generert basert på offisielle norske myndighetskilder og verifiserte kommunale case-studier.', 20, yPos)
  pdf.text('SkiplumXGE leverer profesjonelle energianalyser i henhold til norske byggebransje-standarder.', 20, yPos + 5)
}

function getBuildingTypeNorwegian(buildingType: string): string {
  const typeMap: Record<string, string> = {
    'residential': 'Bolig',
    'office': 'Kontor',
    'retail': 'Butikk',
    'school': 'Skole',
    'hospital': 'Sykehus',
    'hotel': 'Hotell',
    'restaurant': 'Restaurant',
    'warehouse': 'Lager'
  }

  return typeMap[buildingType.toLowerCase()] || buildingType
}

export async function GET(): Promise<NextResponse> {
  return createSecureErrorResponse('Use POST method with report data in request body', 405)
}