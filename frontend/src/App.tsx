import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './views/LoginView';
import { ClientDashboard } from './views/ClientDashboard';
import { OperatorDashboard } from './views/OperatorDashboard';
import { CSVImportView } from './views/CSVImportView';
import { AnalyticsDashboard } from './views/AnalyticsDashboard';
import { AdminView } from './views/AdminView';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading platform context...
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'requests':
        return user.role === 'client' ? <ClientDashboard /> : <OperatorDashboard />;
      case 'import':
        return <CSVImportView />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'admin':
        return user.role === 'admin' ? <AdminView /> : <OperatorDashboard />;
      default:
        return user.role === 'client' ? <ClientDashboard /> : <OperatorDashboard />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main style={{ flex: 1 }}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
