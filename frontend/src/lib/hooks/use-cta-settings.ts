'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import type { ApiResponse, Setting } from '@/lib/types';

export interface CtaSettings {
  zalo: { enabled: boolean; phone: string };
  messenger: { enabled: boolean; url: string };
  phone: { enabled: boolean; number: string };
  whatsapp: { enabled: boolean; number: string };
  email: { enabled: boolean; address: string };
  backToTop: boolean;
  bottomTab: boolean;
}

const DEFAULTS: CtaSettings = {
  zalo: { enabled: false, phone: '' },
  messenger: { enabled: false, url: '' },
  phone: { enabled: false, number: '' },
  whatsapp: { enabled: false, number: '' },
  email: { enabled: false, address: '' },
  backToTop: true,
  bottomTab: true,
};

function parseBool(v: string | undefined): boolean {
  return v === 'true';
}

// Lay CTA settings tu public endpoint, cache trong memory 5 phut
let cache: { data: CtaSettings; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

export function useCtaSettings(): CtaSettings {
  // Lazy initializer doc cache 1 lan luc mount — khong setState trong useEffect
  const [settings, setSettings] = useState<CtaSettings>(() => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
    return DEFAULTS;
  });

  useEffect(() => {
    // Con cache moi thi khong fetch lai
    if (cache && Date.now() - cache.at < TTL_MS) return;
    let cancelled = false;
    apiClient
      .get<ApiResponse<Setting[]>>('/settings/public')
      .then((res) => {
        if (cancelled) return;
        const list = res?.data ?? [];
        const map = new Map(list.map((s) => [s.key, s.value]));
        const parsed: CtaSettings = {
          zalo: {
            enabled: parseBool(map.get('cta.zalo_enabled')),
            phone: map.get('cta.zalo_phone') ?? '',
          },
          messenger: {
            enabled: parseBool(map.get('cta.messenger_enabled')),
            url: map.get('cta.messenger_url') ?? '',
          },
          phone: {
            enabled: parseBool(map.get('cta.phone_enabled')),
            number: map.get('cta.phone_number') ?? '',
          },
          whatsapp: {
            enabled: parseBool(map.get('cta.whatsapp_enabled')),
            number: map.get('cta.whatsapp_number') ?? '',
          },
          email: {
            enabled: parseBool(map.get('cta.email_enabled')),
            address: map.get('cta.email_address') ?? '',
          },
          backToTop: map.has('cta.back_to_top_enabled')
            ? parseBool(map.get('cta.back_to_top_enabled'))
            : true,
          bottomTab: map.has('cta.bottom_tab_enabled')
            ? parseBool(map.get('cta.bottom_tab_enabled'))
            : true,
        };
        cache = { data: parsed, at: Date.now() };
        setSettings(parsed);
      })
      .catch(() => {
        // Silent fail — dung defaults
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
