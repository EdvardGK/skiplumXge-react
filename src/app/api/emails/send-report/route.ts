import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email, fullName, reportData, acceptMarketing } = await request.json()

    // Create HTML email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Din Energirapport</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0891b2 0%, #10b981 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Din Energirapport</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Skiplum Energianalyse</p>
            </div>

            <!-- Main Content -->
            <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #475569;">Hei ${fullName},</p>

              <p style="font-size: 16px; color: #475569;">
                Takk for at du brukte vår energianalyse-tjeneste! Din personlige rapport er vedlagt.
              </p>

              ${reportData ? `
                <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 15px 0;">Dine resultater:</h2>

                  ${reportData.energyGrade ? `
                    <div style="margin-bottom: 12px;">
                      <strong style="color: #475569;">Energikarakter:</strong>
                      <span style="display: inline-block; background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">${reportData.energyGrade}</span>
                    </div>
                  ` : ''}

                  ${reportData.annualWaste ? `
                    <div style="margin-bottom: 12px;">
                      <strong style="color: #475569;">Årlig energisløsing:</strong>
                      <span style="color: #0f172a; margin-left: 8px;">${reportData.annualWaste.toLocaleString('nb-NO')} kr</span>
                    </div>
                  ` : ''}

                  ${reportData.investmentPotential ? `
                    <div style="margin-bottom: 12px;">
                      <strong style="color: #475569;">Investeringspotensial:</strong>
                      <span style="color: #0891b2; font-weight: bold; margin-left: 8px;">${reportData.investmentPotential.toLocaleString('nb-NO')} kr</span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              <h3 style="color: #0f172a; font-size: 18px; margin: 25px 0 15px 0;">Neste steg:</h3>

              <ol style="color: #475569; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Gjennomgå rapporten nøye</li>
                <li style="margin-bottom: 10px;">Identifiser de mest lønnsomme tiltakene</li>
                <li style="margin-bottom: 10px;">Kontakt oss for en uforpliktende samtale</li>
              </ol>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://skiplum.no/kontakt" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #10b981 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Book gratis konsultasjon
                </a>
              </div>

              <p style="font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                <strong>Har du spørsmål?</strong><br>
                Ring oss på <a href="tel:+4712345678" style="color: #0891b2;">+47 123 45 678</a><br>
                eller send e-post til <a href="mailto:hei@skiplum.no" style="color: #0891b2;">hei@skiplum.no</a>
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                © 2024 Skiplum AS. Alle rettigheter reservert.
              </p>
              ${!acceptMarketing ? `
                <p style="font-size: 12px; color: #94a3b8; margin: 10px 0 0 0;">
                  Du har valgt å ikke motta markedsføring fra oss.
                </p>
              ` : `
                <p style="font-size: 12px; color: #94a3b8; margin: 10px 0 0 0;">
                  Du mottar denne e-posten fordi du ba om en energirapport.<br>
                  <a href="https://skiplum.no/avmeld" style="color: #64748b;">Avmeld nyhetsbrev</a>
                </p>
              `}
            </div>
          </div>
        </body>
      </html>
    `

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: "Skiplum Energi <energi@skiplum.no>", // You'll need to verify this domain in Resend
      to: [email],
      subject: "Din personlige energirapport er klar",
      html: emailHtml,
      // Optional: Add a text version for better deliverability
      text: `
        Hei ${fullName},

        Takk for at du brukte vår energianalyse-tjeneste!

        ${reportData ? `
        Dine resultater:
        - Energikarakter: ${reportData.energyGrade || 'N/A'}
        - Årlig energisløsing: ${reportData.annualWaste?.toLocaleString('nb-NO') || '0'} kr
        - Investeringspotensial: ${reportData.investmentPotential?.toLocaleString('nb-NO') || '0'} kr
        ` : ''}

        Neste steg:
        1. Gjennomgå rapporten nøye
        2. Identifiser de mest lønnsomme tiltakene
        3. Kontakt oss for en uforpliktende samtale

        Book gratis konsultasjon: https://skiplum.no/kontakt

        Har du spørsmål?
        Ring oss på +47 123 45 678
        eller send e-post til hei@skiplum.no

        Med vennlig hilsen,
        Skiplum Energi
      `.trim(),
      // Track marketing consent
      tags: [
        { name: "source", value: "report_download" },
        { name: "marketing_consent", value: acceptMarketing ? "yes" : "no" },
      ],
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, messageId: data?.id })
  } catch (error) {
    console.error("Email API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}