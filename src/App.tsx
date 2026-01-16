import { useState } from "react";
import Layout from "./components/Layout";
import type { MenuItem } from "./components/Layout";
import AIDashboard from "./components/AIDashboard";
import FixQualyTimes from "./components/FixQualyTimes";
import BuildResultsDatabase from "./components/BuildResultsDatabase";
import "./App.css";

function App() {
  const [activeView, setActiveView] = useState<MenuItem>("ai-management");

  const renderContent = () => {
    switch (activeView) {
      case "ai-management":
        return <AIDashboard />;
      case "fix-qualy-times":
        return <FixQualyTimes />;
      case "build-results-database":
        return <BuildResultsDatabase />;
      default:
        return <AIDashboard />;
    }
  };

  return (
    <Layout activeMenuItem={activeView} onMenuItemClick={setActiveView}>
      {renderContent()}
    </Layout>
  );
}

export default App;
