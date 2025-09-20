/**
 * PDF Report Generation Hook
 *
 * Handles PDF report generation with dashboard screenshots
 * and Norwegian energy analysis content
 */

import { useState } from 'react'
import { ReportRequest, ReportResponse } from '@/app/api/reports/generate/route'

export interface PDFReportData {
  address: string
  buildingData: {
    buildingType: string
    totalArea: number
    heatedArea: number
    energyGrade?: string
    energyConsumption?: number
  }
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

export interface PDFGenerationState {
  isGenerating: boolean
  progress: string
  error: string | null
}

export function usePdfReport() {
  const [state, setState] = useState<PDFGenerationState>({
    isGenerating: false,
    progress: '',
    error: null
  })

  const generateReport = async (data: PDFReportData): Promise<void> => {
    setState({
      isGenerating: true,
      progress: 'Forbereder rapport...',
      error: null
    })

    try {
      // Get current dashboard URL
      const currentUrl = window.location.href

      setState(prev => ({
        ...prev,
        progress: 'Tar skjermbilde av dashboard...'
      }))

      // Build request payload
      const reportRequest: ReportRequest = {
        address: data.address,
        buildingData: data.buildingData,
        dashboardUrl: currentUrl,
        municipalityNumber: data.municipalityNumber,
        analysisData: data.analysisData
      }

      setState(prev => ({
        ...prev,
        progress: 'Genererer PDF-rapport...'
      }))

      // Call PDF generation API
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportRequest)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      setState(prev => ({
        ...prev,
        progress: 'Fullfører nedlasting...'
      }))

      const result: ReportResponse = await response.json()

      if (!result.success || !result.pdfBuffer) {
        throw new Error(result.error || 'PDF-generering feilet')
      }

      // Convert base64 to blob and download
      const pdfBlob = base64ToBlob(result.pdfBuffer, 'application/pdf')
      const downloadUrl = URL.createObjectURL(pdfBlob)

      // Create download link
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = result.filename || 'Energianalyse.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up object URL
      URL.revokeObjectURL(downloadUrl)

      setState({
        isGenerating: false,
        progress: 'Rapport lastet ned!',
        error: null
      })

      // Clear success message after delay
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          progress: ''
        }))
      }, 3000)

    } catch (error) {
      console.error('PDF generation failed:', error)
      setState({
        isGenerating: false,
        progress: '',
        error: error instanceof Error ? error.message : 'Ukjent feil oppstod'
      })

      // Clear error after delay
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          error: null
        }))
      }, 5000)
    }
  }

  return {
    ...state,
    generateReport
  }
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

/**
 * Helper function to extract building data from search params
 */
export function extractBuildingDataFromParams(searchParams: URLSearchParams): PDFReportData['buildingData'] {
  return {
    buildingType: searchParams.get('buildingType') || 'residential',
    totalArea: parseInt(searchParams.get('totalArea') || '100'),
    heatedArea: parseInt(searchParams.get('heatedArea') || '100'),
    energyGrade: searchParams.get('energyGrade') || undefined,
    energyConsumption: searchParams.get('energyConsumption')
      ? parseFloat(searchParams.get('energyConsumption')!)
      : undefined
  }
}

/**
 * Helper function to build analysis data from energy calculations
 */
export function buildAnalysisData(
  annualWaste: number,
  annualWasteCost: number,
  investmentRoom: number,
  energyBreakdown?: any
): PDFReportData['analysisData'] {
  return {
    annualWaste,
    annualWasteCost,
    investmentRoom,
    energyBreakdown: energyBreakdown || {
      heating: 70, // SINTEF verified data
      lighting: 15, // SINTEF verified data
      ventilation: 10, // SINTEF verified data
      hotWater: 5 // SINTEF verified data
    }
  }
}