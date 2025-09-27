import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Only initialize if keys are available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize Supabase client with service role key for server-side operations
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export async function POST(request: NextRequest) {
  // Check if services are available
  if (!resend) {
    console.warn("Resend API key not configured");
    return NextResponse.json(
      { success: false, message: 'Email service not configured' },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();

    const {
      name,
      email,
      phone,
      orgNumber,
      customerType,
      subject,
      message,
      companyName
    } = body;

    // Format the email content
    const emailContent = `
      Ny henvendelse fra ${customerType === 'bedrift' ? 'bedrift' : 'privatperson'}

      Kontaktinformasjon:
      - Navn: ${name}
      - E-post: ${email}
      - Telefon: ${phone || 'Ikke oppgitt'}
      ${customerType === 'bedrift' ? `- Organisasjon: ${companyName || 'Ikke verifisert'} (${orgNumber})` : ''}

      Emne: ${getSubjectLabel(subject)}

      Melding:
      ${message}
    `;

    // Save to Supabase database first (if configured)
    let dbData = null;
    let dbError = null;

    if (supabase) {
      const result = await supabase
        .from('leads')
        .insert([
          {
            name,
            email,
            phone: phone || null,
            org_number: orgNumber || null,
            company_name: companyName || null,
            customer_type: customerType,
            subject,
            message,
            status: 'new', // Track status: new, read, responded, etc.
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      dbData = result.data;
      dbError = result.error;
    }

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the whole request if DB save fails, still try to send email
    }

    // Send email with Resend
    const { data, error } = await resend.emails.send({
      from: 'SkiplumXGE <noreply@skiplum.no>',
      to: ['iver.grytting@skiplum.no'],
      subject: `Ny henvendelse: ${getSubjectLabel(subject)}`,
      replyTo: email,
      text: emailContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Ny henvendelse fra ${customerType === 'bedrift' ? 'bedrift' : 'privatperson'}</h2>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Kontaktinformasjon:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Navn:</strong> ${name}</li>
              <li><strong>E-post:</strong> <a href="mailto:${email}">${email}</a></li>
              <li><strong>Telefon:</strong> ${phone || 'Ikke oppgitt'}</li>
              ${customerType === 'bedrift' ? `<li><strong>Organisasjon:</strong> ${companyName || 'Ikke verifisert'} (${orgNumber})</li>` : ''}
            </ul>
          </div>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Emne:</h3>
            <p>${getSubjectLabel(subject)}</p>
          </div>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Melding:</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { success: false, message: 'Kunne ikke sende henvendelse' },
        { status: 500 }
      );
    }

    // Log for debugging
    console.log('Email sent successfully:', data);
    if (dbData) {
      console.log('Lead saved to database with ID:', dbData.id);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Henvendelse mottatt',
        emailId: data?.id,
        leadId: dbData?.id,
        saved: !!dbData
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { success: false, message: 'Kunne ikke sende henvendelse' },
      { status: 500 }
    );
  }
}

function getSubjectLabel(subject: string): string {
  const labels: Record<string, string> = {
    'energianalyse': 'Bestilling av energianalyse/rådgivning',
    'kamera': 'Lån av termisk kamera',
    'tilbakemelding': 'Tilbakemelding om appen',
    'annet': 'Annet'
  };
  return labels[subject] || subject;
}