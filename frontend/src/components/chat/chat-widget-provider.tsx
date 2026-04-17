'use client';

import { ChatWidget } from './chat-widget';

interface Props {
  /**
   * Tat widget tren cac layout khong can (vd: admin, dashboard noi bo).
   */
  disabled?: boolean;
}

/**
 * Wrapper client nhe — co the truyen prop `disabled` de an widget.
 * Tach rieng de layout co the import & render ma khong loi lien quan tre WS.
 */
export function ChatWidgetProvider({ disabled = false }: Props) {
  if (disabled) return null;
  return <ChatWidget />;
}
