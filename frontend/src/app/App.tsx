import { useState } from 'react';
import { AdminPage } from '@/features/admin';
import { CreateFlow } from '@/features/create';
import { LibraryPage } from '@/features/library';
import { sound } from '@/shared/sound';
import { useHash } from './hooks/useHash';
import { AppShell, type Tab } from './layout/AppShell';
import { Providers } from './providers';

export function App() {
  const [tab, setTab] = useState<Tab>('create');
  const switchTab = (next: Tab) => {
    if (next !== tab) sound.stop(); // a hidden result must not keep playing music
    setTab(next);
  };
  const [hash, setHash] = useHash();
  const admin = hash === '#admin'; // team admin: open the page with #admin at the end

  return (
    <Providers>
      <AppShell tab={tab} onTabChange={switchTab} showNav={!admin}>
        {admin && <AdminPage onExit={() => setHash('')} />}
        {/* Both stay mounted so a running job survives a peek at the library or admin. */}
        <div hidden={admin || tab !== 'create'}>
          <CreateFlow />
        </div>
        <div hidden={admin || tab !== 'library'}>
          <LibraryPage onCreate={() => switchTab('create')} />
        </div>
      </AppShell>
    </Providers>
  );
}
