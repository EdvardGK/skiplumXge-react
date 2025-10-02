'use client';

import { useState } from 'react';
import { X, Send, Phone, Mail, User, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyAddress?: string;
}

export function ContactFormModal({ isOpen, onClose, propertyAddress }: ContactFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    orgNumber: '',
    customerType: '',
    subject: '',
    message: propertyAddress ? `Jeg er interessert i energianalyse for: ${propertyAddress}` : '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isValidatingOrg, setIsValidatingOrg] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          companyName: companyName
        }),
      });

      if (response.ok) {
        alert('Takk for din henvendelse! Vi kontakter deg innen 1-2 virkedager.');

        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          orgNumber: '',
          customerType: '',
          subject: '',
          message: '',
        });
        setCompanyName(null);
        onClose();
      } else {
        alert('Beklager, noe gikk galt. Vennligst prøv igjen eller kontakt oss direkte.');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Beklager, noe gikk galt. Vennligst prøv igjen eller kontakt oss direkte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // If org number is being changed and is for a business, validate it
    if (field === 'orgNumber' && formData.customerType === 'bedrift') {
      validateOrgNumber(value);
    }

    // Reset company name when switching customer type
    if (field === 'customerType') {
      setCompanyName(null);
      if (value === 'privat') {
        setFormData(prev => ({ ...prev, orgNumber: '' }));
      }
    }
  };

  const validateOrgNumber = async (orgNumber: string) => {
    // Only validate if we have 9 digits
    const cleanNumber = orgNumber.replace(/\s/g, '');
    if (cleanNumber.length !== 9) {
      setCompanyName(null);
      return;
    }

    setIsValidatingOrg(true);
    try {
      const response = await fetch(
        `https://data.brreg.no/enhetsregisteret/api/enheter/${cleanNumber}`
      );

      if (response.ok) {
        const data = await response.json();
        setCompanyName(data.navn);
      } else {
        setCompanyName(null);
      }
    } catch (error) {
      console.error('Failed to validate org number:', error);
      setCompanyName(null);
    } finally {
      setIsValidatingOrg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-popover border border-border rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-popover border-b border-border p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Lukk"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            Kontakt oss
          </h2>
          <p className="text-text-tertiary text-sm">
            La oss hjelpe deg med å redusere energikostnadene
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Type */}
          <div className="space-y-2">
            <Label className="text-text-secondary">
              Type kunde
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChange('customerType', 'privat')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all ${
                  formData.customerType === 'privat'
                    ? 'border-primary bg-primary-muted text-foreground'
                    : 'border-border/50 bg-card/50 text-text-secondary hover:border-border hover:text-foreground hover:bg-card backdrop-blur-sm'
                }`}
              >
                <User className="w-4 h-4" />
                Privat
              </button>
              <button
                type="button"
                onClick={() => handleChange('customerType', 'bedrift')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all ${
                  formData.customerType === 'bedrift'
                    ? 'border-primary bg-primary-muted text-foreground'
                    : 'border-border/50 bg-card/50 text-text-secondary hover:border-border hover:text-foreground hover:bg-card backdrop-blur-sm'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Bedrift
              </button>
            </div>
          </div>

          {/* Name and Email Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-text-secondary">
                Navn *
              </Label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="bg-input border-input-border text-input-foreground placeholder-input-placeholder focus:border-input-border-focus"
                placeholder="Ola Nordmann"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-text-secondary">
                E-post *
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="bg-input border-input-border text-input-foreground placeholder-input-placeholder focus:border-input-border-focus"
                placeholder="ola@eksempel.no"
              />
            </div>
          </div>

          {/* Phone and Company Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-text-secondary">
                Telefon
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="bg-input border-input-border text-input-foreground placeholder-input-placeholder focus:border-input-border-focus"
                placeholder="+47 123 45 678"
              />
            </div>

            {formData.customerType === 'bedrift' && (
              <div className="space-y-2">
                <Label htmlFor="orgNumber" className="text-text-secondary">
                  Organisasjonsnummer
                </Label>
                <div>
                  <Input
                    id="orgNumber"
                    type="text"
                    value={formData.orgNumber}
                    onChange={(e) => handleChange('orgNumber', e.target.value)}
                    className="bg-input border-input-border text-input-foreground placeholder-input-placeholder focus:border-input-border-focus"
                    placeholder="999 999 999"
                    maxLength={11}
                  />
                  {isValidatingOrg && (
                    <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1 pl-3">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sjekker...
                    </p>
                  )}
                  {companyName && !isValidatingOrg && (
                    <p className="text-xs text-emerald-400 mt-1 pl-3">
                      {companyName}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-text-secondary">
              Hva gjelder henvendelsen?
            </Label>
            <Select
              value={formData.subject}
              onValueChange={(value) => handleChange('subject', value)}
            >
              <SelectTrigger className="w-full bg-input border-input-border text-input-foreground hover:bg-secondary-hover focus:border-input-border-focus">
                <SelectValue placeholder="Velg emne for henvendelsen" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border" style={{ zIndex: 9999 }}>
                <SelectItem value="energianalyse" className="text-text-secondary hover:bg-secondary hover:text-foreground focus:bg-secondary-hover focus:text-foreground cursor-pointer">
                  Jeg vil bestille energianalyse/rådgivning
                </SelectItem>
                <SelectItem value="kamera" className="text-text-secondary hover:bg-secondary hover:text-foreground focus:bg-secondary-hover focus:text-foreground cursor-pointer">
                  Jeg vil låne termisk kamera
                </SelectItem>
                <SelectItem value="tilbakemelding" className="text-text-secondary hover:bg-secondary hover:text-foreground focus:bg-secondary-hover focus:text-foreground cursor-pointer">
                  Jeg har tilbakemelding om appen
                </SelectItem>
                <SelectItem value="annet" className="text-text-secondary hover:bg-secondary hover:text-foreground focus:bg-secondary-hover focus:text-foreground cursor-pointer">
                  Annet
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-text-secondary">
              Melding *
            </Label>
            <Textarea
              id="message"
              required
              rows={4}
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              className="bg-gray-900/50 border-gray-700/50 text-foreground placeholder-gray-500 focus:border-emerald-400/50 resize-none"
              placeholder="Fortell oss om ditt prosjekt og hva du ønsker hjelp med..."
            />
          </div>


          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r bg-gradient-primary hover:from-emerald-600 hover:to-cyan-600 text-foreground font-medium h-11"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sender...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send henvendelse
              </>
            )}
          </Button>

          {/* Contact Info */}
          <div className="pt-4 border-t border-border space-y-2">
            <p className="text-xs text-text-muted text-center">
              Eller kontakt oss direkte
            </p>
            <div className="flex justify-center space-x-6 text-xs">
              <a
                href="tel:+4799265242"
                className="flex items-center text-text-tertiary hover:text-primary transition-colors"
              >
                <Phone className="w-3 h-3 mr-1" />
                +47 992 65 242
              </a>
              <a
                href="mailto:iver.grytting@skiplum.no"
                className="flex items-center text-text-tertiary hover:text-primary transition-colors"
              >
                <Mail className="w-3 h-3 mr-1" />
                iver.grytting@skiplum.no
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}