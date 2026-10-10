import { ArrowRight, Camera, Clapperboard, Library, Lightbulb, PencilRuler } from 'lucide-react';
import { useI18n, type MessageKey } from '@/shared/i18n';
import { Button, Card } from '@/shared/ui';

export function GuidePage({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();

  return (
    <article className="space-y-6 pb-4">
      <header className="space-y-2">
        <p className="font-display text-sm font-bold text-coral">{t('guide.eyebrow')}</p>
        <h2 className="font-display text-3xl font-extrabold text-balance">{t('guide.title')}</h2>
        <p className="text-muted">{t('guide.intro')}</p>
      </header>

      <Card className="space-y-4 p-5">
        <h3 className="font-display text-xl font-bold">{t('guide.quickTitle')}</h3>
        <ol className="grid gap-3 sm:grid-cols-2">
          {(['source', 'choose', 'describe', 'result'] as const).map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sun font-display font-bold text-sun-ink">
                {index + 1}
              </span>
              <span className="pt-1 text-sm">{t(`guide.step.${step}`)}</span>
            </li>
          ))}
        </ol>
        <Button icon={<ArrowRight />} onClick={onCreate}>
          {t('guide.start')}
        </Button>
      </Card>

      <div className="grid gap-x-8 sm:grid-cols-2">
        <GuideSection
          icon={<Camera />}
          title={t('guide.sourceTitle')}
          items={['guide.source1', 'guide.source2', 'guide.source3']}
        />
        <GuideSection
          icon={<PencilRuler />}
          title={t('guide.motionTitle')}
          items={['guide.motion1', 'guide.motion2', 'guide.motion3']}
        />
        <GuideSection
          icon={<Lightbulb />}
          title={t('guide.extrasTitle')}
          items={['guide.extras1', 'guide.extras2', 'guide.extras3']}
        />
        <GuideSection
          icon={<Clapperboard />}
          title={t('guide.resultTitle')}
          items={['guide.result1', 'guide.result2', 'guide.result3']}
        />
        <GuideSection
          icon={<Library />}
          title={t('guide.libraryTitle')}
          items={['guide.library1', 'guide.library2']}
        />
        <GuideSection
          icon={<Lightbulb />}
          title={t('guide.teamTitle')}
          items={['guide.team1', 'guide.team2']}
        />
      </div>
    </article>
  );
}

function GuideSection({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: MessageKey[];
}) {
  const { t } = useI18n();

  return (
    <section className="space-y-3 border-t border-line py-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold">
        <span aria-hidden="true" className="text-coral [&>svg]:size-5">
          {icon}
        </span>
        {title}
      </h3>
      <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-muted marker:text-coral">
        {items.map((item) => (
          <li key={item}>{t(item)}</li>
        ))}
      </ul>
    </section>
  );
}