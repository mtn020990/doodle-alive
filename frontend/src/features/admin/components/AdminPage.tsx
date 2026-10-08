import { ArrowLeft, KeyRound, RefreshCw, Server } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { adminApi, ApiError, type GpuServer, type HfKey } from '@/shared/api';
import { useI18n, type Translate } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Alert, Button, Card, Spinner, TextInput } from '@/shared/ui';
import { readPin, savePin } from '../lib/pin';

type FormatTime = (iso?: string | null) => string;

interface Panel {
  keys: HfKey[];
  servers: GpuServer[];
}

async function fetchAll(pin: string): Promise<Panel> {
  const [k, s] = await Promise.all([adminApi.hfKeys(pin), adminApi.gpuServers(pin)]);
  return { keys: k.keys, servers: s.servers };
}

function keyStatus(key: HfKey, t: Translate, time: FormatTime) {
  if (key.quota_hit_at) return t('admin.outOfQuota', { time: time(key.quota_hit_at) });
  if (key.last_ok_at) return t('admin.lastWorked', { time: time(key.last_ok_at) });
  return t('admin.notUsed');
}

function serverStatus(server: GpuServer, t: Translate, time: FormatTime) {
  if (!server.url) return t('admin.serverOff');
  if (server.last_error) {
    return t('admin.serverFailed', { time: time(server.last_error_at), error: server.last_error });
  }
  if (server.last_ok_at) return t('admin.lastWorked', { time: time(server.last_ok_at) });
  return t('admin.serverReady');
}

/** Team admin (page URL + #admin): Hugging Face key status/switching and free GPU server links. */
export function AdminPage({ onExit }: { onExit: () => void }) {
  const { t, lang } = useI18n();
  const [pin, setPin] = useState(readPin);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const time: FormatTime = (iso) => (iso ? new Date(iso).toLocaleTimeString(lang) : '');

  const show = (next: Panel) => {
    setPanel(next);
    setUpdatedAt(new Date());
  };

  const fail = (err: unknown) => {
    setError((err as Error).message);
    if (err instanceof ApiError && err.status === 401) setPanel(null); // wrong PIN: hide old data
  };

  /** Runs one admin call with the typed PIN; remembers the PIN when it works. */
  const call = async (work: () => Promise<Panel>) => {
    setBusy(true);
    setError(null);
    try {
      show(await work());
      savePin(pin);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  // Load once with the PIN remembered from earlier in this browser tab.
  useEffect(() => {
    const saved = readPin();
    if (!saved) return;
    let alive = true;
    fetchAll(saved)
      .then((next) => {
        if (!alive) return;
        setPanel(next);
        setUpdatedAt(new Date());
      })
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, []);

  const login = (e: FormEvent) => {
    e.preventDefault();
    void call(() => fetchAll(pin));
  };

  return (
    <section className="space-y-5">
      <Button variant="ghost" icon={<ArrowLeft />} onClick={onExit} className="-ml-2">
        {t('admin.exit')}
      </Button>
      <header>
        <h2 className="text-3xl font-extrabold">{t('admin.title')}</h2>
        <p className="text-muted">{t('admin.subtitle')}</p>
      </header>

      <form onSubmit={login} className="flex gap-2">
        <TextInput
          type="password"
          inputMode="numeric"
          autoComplete="off"
          required
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder={t('admin.pin')}
          aria-label={t('admin.pin')}
        />
        <Button type="submit" disabled={busy} icon={busy ? <Spinner /> : <KeyRound />}>
          {t('admin.open')}
        </Button>
      </form>

      {error && <Alert tone="danger">{error}</Alert>}

      {panel && (
        <>
          <AdminCard icon={<KeyRound />} title={t('admin.hfKeys')} hint={t('admin.hfKeysHint')}>
            {panel.keys.length === 0 && <p className="text-sm">{t('admin.noKeys')}</p>}
            <ul className="space-y-2">
              {panel.keys.map((key) => (
                <li
                  key={key.name}
                  className={cn('flex items-center gap-3 rounded-2xl p-3', rowTone(key.active))}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {key.name}
                      {key.active && <span className="text-mint"> · {t('admin.inUse')}</span>}
                    </p>
                    <p className="text-xs text-muted">{keyStatus(key, t, time)}</p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={key.active || busy}
                    onClick={() =>
                      call(async () => ({
                        ...panel,
                        keys: (await adminApi.useHfKey(pin, key.name)).keys,
                      }))
                    }
                  >
                    {t('admin.use')}
                  </Button>
                </li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard icon={<Server />} title={t('admin.gpuServers')} hint={t('admin.gpuHint')}>
            <ul className="space-y-3">
              {panel.servers.map((server) => (
                <ServerRow
                  // Keyed by URL too, so the input shows the saved link after a refresh.
                  key={`${server.name}|${server.url}`}
                  server={server}
                  status={serverStatus(server, t, time)}
                  busy={busy}
                  onSave={(url) =>
                    call(async () => ({
                      ...panel,
                      servers: (await adminApi.setGpuServer(pin, server.name, url)).servers,
                    }))
                  }
                />
              ))}
            </ul>
          </AdminCard>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {updatedAt && t('admin.updated', { time: updatedAt.toLocaleTimeString(lang) })}
            </p>
            <Button
              variant="secondary"
              icon={<RefreshCw />}
              disabled={busy}
              onClick={() => call(() => fetchAll(pin))}
            >
              {t('admin.refresh')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

const rowTone = (active: boolean) => (active ? 'bg-mint/20 ring-2 ring-mint' : 'bg-sunken');

function AdminCard({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <Card className="space-y-3 p-4">
      <h3 className="flex items-center gap-2 font-display text-xl font-extrabold [&>svg]:size-5 [&>svg]:text-grape">
        {icon}
        {title}
      </h3>
      <p className="text-sm text-muted">{hint}</p>
      {children}
    </Card>
  );
}

interface ServerRowProps {
  server: GpuServer;
  status: string;
  busy: boolean;
  onSave: (url: string) => void;
}

function ServerRow({ server, status, busy, onSave }: ServerRowProps) {
  const { t } = useI18n();
  const [url, setUrl] = useState(server.url);

  return (
    <li className={cn('space-y-2 rounded-2xl p-3', rowTone(!!(server.url && server.last_ok_at)))}>
      <p className="font-bold">{server.name}</p>
      <p className="text-xs break-words text-muted">{status}</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(url.trim());
        }}
      >
        <TextInput
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://….gradio.live"
          aria-label={t('admin.serverLink', { name: server.name })}
        />
        <Button type="submit" variant="secondary" disabled={busy}>
          {t('admin.save')}
        </Button>
      </form>
    </li>
  );
}
