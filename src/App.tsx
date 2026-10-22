import React, { useState, useEffect } from 'react';
import { AppSidebar, PageId, NAV_ITEMS } from './components/layout/AppSidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewPage } from './components/pages/OverviewPage';
import { DigitalTwinPage } from './components/pages/DigitalTwinPage';
import { ScenarioSimulationPage } from './components/pages/ScenarioSimulationPage';
import { RestorationPlanningPage } from './components/pages/RestorationPlanningPage';
import { AnalyticsPage } from './components/pages/AnalyticsPage';
import { ScenarioComparisonPage } from './components/pages/ScenarioComparisonPage';
import { QuantumSolverPage } from './components/pages/QuantumSolverPage';
import { SettingsPage } from './components/pages/SettingsPage';

const VALID_PAGES: PageId[] = [
  'overview',
  'twin',
  'scenarios',
  'restoration',
  'analytics',
  'compare',
  'quantum',
  'settings',
];

export default function App() {
  // Read initial page from hash or default to 'overview'
  const [activePage, setActivePage] = useState<PageId>(() => {
    const hash = window.location.hash.replace('#', '') as PageId;
    return VALID_PAGES.includes(hash) ? hash : 'overview';
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Synchronize with browser Back and Forward history buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as PageId;
      if (VALID_PAGES.includes(hash)) {
        setActivePage(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleNavigate = (page: PageId) => {
    setActivePage(page);
    window.location.hash = page;
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#090d16] text-slate-100 font-sans">
      {/* Persistent Left Sidebar Navigation */}
      <AppSidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <TopBar
          activePage={activePage}
          onToggleMobile={() => setIsMobileOpen(true)}
        />

        {/* Page Viewport Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {/* 
            Persistent 3D Digital Twin Viewport:
            Kept mounted so camera orientation, pan offset, and WebGL state
            are never lost or recompiled when switching between pages.
          */}
          <div className={`w-full h-full ${activePage === 'twin' ? 'flex' : 'hidden'}`}>
            <DigitalTwinPage />
          </div>

          {/* Dedicated Individual Pages */}
          {activePage === 'overview' && (
            <OverviewPage onNavigate={handleNavigate} />
          )}

          {activePage === 'scenarios' && (
            <ScenarioSimulationPage />
          )}

          {activePage === 'restoration' && (
            <RestorationPlanningPage />
          )}

          {activePage === 'analytics' && (
            <AnalyticsPage />
          )}

          {activePage === 'compare' && (
            <ScenarioComparisonPage />
          )}

          {activePage === 'quantum' && (
            <QuantumSolverPage />
          )}

          {activePage === 'settings' && (
            <SettingsPage />
          )}
        </div>
      </div>
    </div>
  );
}
