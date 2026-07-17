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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/trip/:tripId" component={TripDashboard} />
      <Route path="/trip/:tripId/leaderboard" component={TripLeaderboard} />
      <Route path="/trip/:tripId/notifications" component={NotificationFeed} />
      <Route path="/round/:roundId/leaderboard" component={DailyLeaderboard} />
      <Route path="/round/:roundId/score" component={ScoreEntry} />
      <Route path="/round/:roundId/side-matches" component={SideMatches} />
      <Route path="/round/:roundId/match-play" component={MatchPlay} />
      <Route path="/trip/:tripId/chat" component={TripChat} />
      <Route path="/admin" component={AdminTrips} />
      <Route path="/admin/trips" component={AdminTrips} />
      <Route path="/admin/trips/:id" component={AdminTripDetail} />
      <Route path="/admin/trips/:tripId/players" component={AdminPlayers} />
      <Route path="/admin/trips/:tripId/rounds" component={AdminRounds} />
      <Route path="/admin/trips/:tripId/rounds/:roundId/groups" component={AdminGroups} />
      <Route path="/admin/trips/:tripId/handicap" component={AdminHandicap} />
      <Route path="/admin/courses" component={AdminCourses} />
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
