import { useEffect, useState } from 'react';

type BusinessData = {
  businessName: string;
  whatsappNumber: string | null;
  whatsappBookingTemplate: string | null;
  whatsappClientTemplate: string | null;
  minCancelHours: number;
};

let cached: BusinessData | null = null;
let fetchPromise: Promise<BusinessData> | null = null;

async function fetchBusiness(): Promise<BusinessData> {
  if (cached) return cached;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/business')
    .then(async (res) => {
      const data = await res.json();
      const result: BusinessData = {
        businessName: data.business?.name ?? 'Ortiga Tattoo',
        whatsappNumber: data.business?.whatsappNumber ?? null,
        whatsappBookingTemplate: data.business?.whatsappMessageTemplate ?? null,
        whatsappClientTemplate: data.business?.whatsappClientMessageTemplate ?? null,
        minCancelHours: data.business?.minCancelHours ?? 48,
      };
      cached = result;
      return result;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function useBookingBusiness() {
  const [businessName, setBusinessName] = useState(cached?.businessName ?? 'Ortiga Tattoo');
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(cached?.whatsappNumber ?? null);
  const [whatsappBookingTemplate, setWhatsappBookingTemplate] = useState<string | null>(
    cached?.whatsappBookingTemplate ?? null,
  );
  const [whatsappClientTemplate, setWhatsappClientTemplate] = useState<string | null>(
    cached?.whatsappClientTemplate ?? null,
  );
  const [minCancelHours, setMinCancelHours] = useState(cached?.minCancelHours ?? 48);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;

    fetchBusiness().then((data) => {
      if (cancelled) return;
      setBusinessName(data.businessName);
      setWhatsappNumber(data.whatsappNumber);
      setWhatsappBookingTemplate(data.whatsappBookingTemplate);
      setWhatsappClientTemplate(data.whatsappClientTemplate);
      setMinCancelHours(data.minCancelHours);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    businessName,
    whatsappNumber,
    whatsappBookingTemplate,
    whatsappClientTemplate,
    minCancelHours,
    loading,
  };
}
