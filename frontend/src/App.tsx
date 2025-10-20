import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { TipsPage } from "./pages/TipsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { MeetingDetailsPage } from "./pages/MeetingDetailsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AuthPage } from "./pages/AuthPage";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activePage, setActivePage] = useState("home");
  const [showMeetingDetails, setShowMeetingDetails] =
    useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handlePageChange = (newPage: string) => {
    setActivePage(newPage);
    setShowMeetingDetails(false); // Close meeting details when navigating to a new page
    setIsMobileMenuOpen(false); // Close mobile menu when navigating
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActivePage("home");
    setShowMeetingDetails(false);
    console.log("User logged out");
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setActivePage("home");
  };

  const renderPage = () => {
    if (showMeetingDetails) {
      return (
        <MeetingDetailsPage
          onBack={() => setShowMeetingDetails(false)}
        />
      );
    }

    switch (activePage) {
      case "home":
        return <HomePage />;
      case "analytics":
        return <DashboardPage />;
      case "tips":
        return (
          <TipsPage
            onShowMeetingDetails={() =>
              setShowMeetingDetails(true)
            }
            onNavigateToAnalytics={() => handlePageChange("analytics")}
          />
        );
      case "calendar":
        return (
          <CalendarPage
            onShowMeetingDetails={() =>
              setShowMeetingDetails(true)
            }
          />
        );
      case "notifications":
        return (
          <NotificationsPage
            onShowMeetingDetails={() =>
              setShowMeetingDetails(true)
            }
          />
        );
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <AuthPage onLoginSuccess={handleLoginSuccess} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-['Inter'] flex relative overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-white rounded-2xl p-3 shadow-lg"
      >
        <Menu className="w-6 h-6 text-gray-800" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onPageChange={handlePageChange}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      {renderPage()}

      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}