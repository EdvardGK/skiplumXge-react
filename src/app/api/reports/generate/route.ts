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

    // Single page with property info and placeholder
    addSimplifiedPage(pdf, address, buildingData)

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

function addSimplifiedPage(pdf: jsPDF, address: string, buildingData: any) {
  // SkiplumXGE Header
  pdf.setFontSize(28)
  pdf.setTextColor(0, 150, 180) // Cyan
  pdf.text('SkiplumXGE', 20, 40)

  pdf.setFontSize(16)
  pdf.setTextColor(100, 100, 100)
  pdf.text('Energianalyse', 20, 50)

  // Property information
  pdf.setFontSize(18)
  pdf.setTextColor(0, 0, 0)
  pdf.text('Eiendomsinformasjon', 20, 80)

  pdf.setFontSize(14)
  pdf.text(`Eiendom: ${address}`, 20, 95)
  pdf.text(`Bygningstype: ${getBuildingTypeNorwegian(buildingData.buildingType)}`, 20, 105)
  pdf.text(`Totalt areal: ${buildingData.totalArea.toLocaleString()} m²`, 20, 115)
  pdf.text(`Oppvarmet areal: ${buildingData.heatedArea.toLocaleString()} m²`, 20, 125)

  if (buildingData.energyGrade) {
    pdf.text(`Energikarakter: ${buildingData.energyGrade}`, 20, 135)
  }

  // Placeholder message
  pdf.setFontSize(24)
  pdf.setTextColor(150, 150, 150)
  pdf.text('Placeholder', 105, 160, { align: 'center' })

  pdf.setFontSize(16)
  pdf.text('Her kommer din energirapport', 105, 175, { align: 'center' })

  // Date footer
  const date = new Date().toLocaleDateString('no-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  pdf.setFontSize(10)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Generert: ${date}`, 20, 280)
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