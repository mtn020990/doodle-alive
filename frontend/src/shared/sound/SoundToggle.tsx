import { Volume2, VolumeX } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { sound } from './sound';

interface SoundToggleProps {
  effect?: string | null;
  music?: string | null;
}

/** Mutes the result's sound, or turns it back on and replays it. */
export function SoundToggle({ effect, music }: SoundToggleProps) {
  const { t } = useI18n();
  const muted = useSyncExternalStore(sound.subscribe, sound.isMuted);
  if (!effect && !music) return null;

  const toggle = () => {
    sound.unlock();
    sound.setMuted(!muted);
    if (muted) sound.play(effect, music);
  };

  return (
    <div className="flex justify-center">
      <Button
        variant="ghost"
        icon={muted ? <VolumeX /> : <Volume2 />}
        aria-pressed={!muted}
        onClick={toggle}
      >
        {muted ? t('sound.off') : t('sound.on')}
      </Button>
    </div>
  );
}
