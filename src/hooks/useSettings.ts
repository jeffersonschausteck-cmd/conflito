import { useEffect, useState } from "react";
import { settingsService } from "@/services/settingsService";
import type { GameSettings } from "@/types/game";

export function useSettings() {
  const [settings, setSettings] = useState<GameSettings>(() => settingsService.load());

  useEffect(() => {
    settingsService.save(settings);
  }, [settings]);

  return [settings, setSettings] as const;
}
