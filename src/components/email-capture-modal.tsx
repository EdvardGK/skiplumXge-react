"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Mail, Loader2, CheckCircle } from "lucide-react"
import { supabaseClient } from "@/lib/supabase"

const emailSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  fullName: z.string().min(2, "Navn må være minst 2 tegn"),
  phone: z.string().optional(),
  acceptMarketing: z.boolean().default(true),
})

interface EmailFormData {
  email: string
  fullName: string
  phone?: string
  acceptMarketing?: boolean
}

interface EmailCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (data: EmailFormData) => void
  reportData?: any // The data to include in the report
  propertyAddress?: string
  investmentPotential?: number
}

export function EmailCaptureModal({
  open,
  onOpenChange,
  onSuccess,
  reportData,
  propertyAddress,
  investmentPotential,
}: EmailCaptureModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema) as any,
    defaultValues: {
      acceptMarketing: true
    }
  })

  const onSubmit = async (data: EmailFormData) => {
    setIsSubmitting(true)

    try {
      // Store lead in Supabase
      const { error: dbError } = await (supabaseClient as any)
        .from("leads")
        .insert({
          email: data.email,
          full_name: data.fullName,
          phone: data.phone || null,
          source: "report_download",
          property_address: propertyAddress || null,
          investment_potential: investmentPotential || null,
          status: "new",
          created_at: new Date().toISOString(),
        })

      if (dbError) {
        console.error("Failed to save lead:", dbError)
        // Continue anyway - we still want to send the report
      }

      // Send email with report
      const response = await fetch("/api/emails/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          fullName: data.fullName,
          reportData: reportData,
          acceptMarketing: data.acceptMarketing,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send email")
      }

      setSubmitSuccess(true)

      // Wait a moment to show success state
      setTimeout(() => {
        onSuccess(data)
        onOpenChange(false)
        reset()
        setSubmitSuccess(false)
      }, 1500)
    } catch (error) {
      console.error("Error:", error)
      alert("Beklager, noe gikk galt. Prøv igjen.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-400/10 rounded-lg">
              <Mail className="h-6 w-6 text-cyan-400" />
            </div>
            <DialogTitle className="text-xl text-white">
              Få energirapporten på e-post
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300">
            Vi sender rapporten direkte til din innboks sammen med personlige anbefalinger
            for å redusere energikostnadene.
          </DialogDescription>
        </DialogHeader>

        {submitSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-emerald-400" />
            <p className="text-lg font-medium text-white">Rapport sendt!</p>
            <p className="text-sm text-slate-300 text-center">
              Sjekk innboksen din om et øyeblikk
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-200">
                Fullt navn *
              </Label>
              <Input
                id="fullName"
                {...register("fullName")}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                placeholder="Ola Nordmann"
              />
              {errors.fullName && (
                <p className="text-sm text-red-400">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                E-postadresse *
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                placeholder="ola@bedrift.no"
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200">
                Telefon (valgfritt)
              </Label>
              <Input
                id="phone"
                {...register("phone")}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                placeholder="+47 123 45 678"
              />
              {errors.phone && (
                <p className="text-sm text-red-400">{errors.phone.message}</p>
              )}
            </div>

            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="acceptMarketing"
                {...register("acceptMarketing")}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-cyan-400 focus:ring-cyan-400"
                defaultChecked
              />
              <Label htmlFor="acceptMarketing" className="text-sm text-slate-300">
                Ja takk, send meg tips om energisparing og oppdateringer om nye funksjoner
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-white/20 text-slate-300 hover:bg-white/10"
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sender...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Send rapport
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-slate-400 text-center pt-2">
              Vi respekterer ditt personvern. Les vår{" "}
              <a href="/personvern" className="underline hover:text-cyan-400">
                personvernerklæring
              </a>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}