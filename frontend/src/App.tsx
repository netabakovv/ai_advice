import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { HomePage } from "./components/HomePage";
import { DashboardPage } from "./components/DashboardPage";
import { TipsPage } from "./components/TipsPage";
import { MeetingDetailsPage } from "./components/MeetingDetailsPage";

export default function App() {
  const [activePage, setActivePage] = useState("home");
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);

  const handlePageChange = (newPage: string) => {
    setActivePage(newPage);
    setShowMeetingDetails(false); // Close meeting details when navigating to a new page
  };

  const renderPage = () => {
    if (showMeetingDetails) {
      return <MeetingDetailsPage onBack={() => setShowMeetingDetails(false)} />;
    }
    
    switch (activePage) {
      case "home":
        return <HomePage />;
      case "dashboard":
        return <DashboardPage />;
      case "tips":
        return <TipsPage onShowMeetingDetails={() => setShowMeetingDetails(true)} />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-['Inter'] flex relative overflow-hidden">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onPageChange={handlePageChange} />
      
      {/* Main Content */}
      {renderPage()}
    </div>
  );
}