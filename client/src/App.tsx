import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import InstallPrompt from "./components/InstallPrompt";
import Home from "./pages/Home";
import AdminTrips from "./pages/admin/AdminTrips";
import AdminTripDetail from "./pages/admin/AdminTripDetail";
import AdminPlayers from "./pages/admin/AdminPlayers";
import AdminRounds from "./pages/admin/AdminRounds";
import AdminGroups from "./pages/admin/AdminGroups";
import AdminHandicap from "./pages/admin/AdminHandicap";
import AdminCourses from "./pages/admin/AdminCourses";
import ScoreEntry from "./pages/ScoreEntry";
import DailyLeaderboard from "./pages/DailyLeaderboard";
import TripLeaderboard from "./pages/TripLeaderboard";
import NotificationFeed from "./pages/NotificationFeed";
import SideMatches from "./pages/SideMatches";
import TripDashboard from "./pages/TripDashboard";
import TripChat from "./pages/TripChat";
import MatchPlay from "./pages/MatchPlay";
import JoinTrip from "./pages/JoinTrip";
import JoinTripShare from "./pages/JoinTripShare";
import AdminRoster from "./pages/admin/AdminRoster";
import AdminNTP from "./pages/admin/AdminNTP";
import AdminAwards from "./pages/admin/AdminAwards";
import TripPlayers from "./pages/TripPlayers";
import MyHandicap from "./pages/MyHandicap";
import MyProfile from "./pages/MyProfile";
import NTPResults from "./pages/NTPResults";
import LongDriveResults from "./pages/LongDriveResults";
import AdminLongDrive from "./pages/admin/AdminLongDrive";
import AdminPlanManagement from "./pages/admin/AdminPlanManagement";
import GroupPairing from "./pages/GroupPairing";
import TeeSheet from "./pages/TeeSheet";
import AmbroseScoreEntry from "./pages/AmbroseScoreEntry";
import AdminPennant from "./pages/admin/AdminPennant";
import PennantFixtureScoring from "./pages/PennantFixtureScoring";
import GolfAssistant from "./pages/GolfAssistant";
import AdminTripFaqs from "./pages/admin/AdminTripFaqs";
import AppSettings from "./pages/AppSettings";
import AdminTripAppearance from "./pages/admin/AdminTripAppearance";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/assistant" component={GolfAssistant} />
      <Route path="/settings" component={AppSettings} />
      <Route path="/trip/:tripId" component={TripDashboard} />
      <Route path="/trip/:tripId/leaderboard" component={TripLeaderboard} />
      <Route path="/trip/:tripId/notifications" component={NotificationFeed} />
      <Route path="/round/:roundId/leaderboard" component={DailyLeaderboard} />
      <Route path="/round/:roundId/score" component={ScoreEntry} />
      <Route path="/round/:roundId/side-matches" component={SideMatches} />
      <Route path="/round/:roundId/match-play" component={MatchPlay} />
      <Route path="/trip/:tripId/chat" component={TripChat} />
      <Route path="/trip/:tripId/players" component={TripPlayers} />
      <Route path="/trip/:tripId/my-handicap" component={MyHandicap} />
      <Route path="/trip/:tripId/my-profile" component={MyProfile} />
      <Route path="/round/:roundId/ntp" component={NTPResults} />
      <Route path="/round/:roundId/long-drive" component={LongDriveResults} />
      <Route path="/trip/:tripId/my-group/:roundId" component={GroupPairing} />
      <Route path="/trip/:tripId/round/:roundId/teesheet" component={TeeSheet} />
      <Route path="/round/:roundId/ambrose" component={AmbroseScoreEntry} />
      <Route path="/round/:roundId/pennant/fixture/:fixtureId" component={PennantFixtureScoring} />
      <Route path="/admin" component={AdminTrips} />
      <Route path="/admin/trips" component={AdminTrips} />
      <Route path="/admin/trips/:id" component={AdminTripDetail} />
      <Route path="/admin/trips/:tripId/players" component={AdminPlayers} />
      <Route path="/admin/trips/:tripId/rounds" component={AdminRounds} />
      <Route path="/admin/trips/:tripId/rounds/:roundId/groups" component={AdminGroups} />
      <Route path="/admin/trips/:tripId/rounds/:roundId/ntp" component={AdminNTP} />
      <Route path="/admin/trips/:tripId/rounds/:roundId/long-drive" component={AdminLongDrive} />
      <Route path="/admin/trips/:tripId/rounds/:roundId/pennant" component={AdminPennant} />
      <Route path="/admin/trips/:tripId/awards" component={AdminAwards} />
      <Route path="/admin/trips/:tripId/faqs" component={AdminTripFaqs} />
      <Route path="/admin/trips/:tripId/appearance" component={AdminTripAppearance} />
      <Route path="/admin/trips/:tripId/handicap" component={AdminHandicap} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/trips/:tripId/roster" component={AdminRoster} />
      <Route path="/admin/plans" component={AdminPlanManagement} />
      <Route path="/join/:token" component={JoinTrip} />
      <Route path="/join-trip/:tripId" component={JoinTripShare} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
          <InstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
