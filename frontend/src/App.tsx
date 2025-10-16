import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { TipsPage } from "./pages/TipsPage";
import { MeetingDetailsPage } from "./pages/MeetingDetailsPage";
import {CalendarPage} from "./pages/CalendarPage";

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
      case "calendar":
        return <CalendarPage />;
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