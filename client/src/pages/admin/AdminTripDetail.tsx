import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Calendar, BarChart2, Flag, Mail, Trophy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PremiumFeatureBadge } from "@/components/PremiumFeatureBadge";
import { EditTripDialog } from "@/components/EditTripDialog";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: React.ReactNode;
};

export default function AdminTripDetail() {
  const { id } = useParams<{ id: string }>();
  const tripId = Number(id);
  const { data: trip, refetch } = trpc.trips.get.useQuery({ id: tripId });

  const navItems: NavItem[] = [
    { href: `/admin/trips/${tripId}/roster`, icon: Mail, label: "Invite Players (Roster)" },
    { href: `/admin/trips/${tripId}/players`, icon: Users, label: "Manage Players" },
    { href: `/admin/trips/${tripId}/rounds`, icon: Calendar, label: "Manage Rounds" },
    { href: `/admin/trips/${tripId}/handicap`, icon: BarChart2, label: "Handicap Settings" },
    {
      href: `/admin/trips/${tripId}/awards`,
      icon: Trophy,
      label: "Custom Awards",
      badge: (
        <PremiumFeatureBadge
          tier="tripPass"
          tooltip="Custom Awards will require a Trip Pass when billing is enabled."
          className="ml-1"
        />
      ),
    },
    { href: `/trip/${tripId}`, icon: Flag, label: "View Trip Dashboard" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <Flag className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-bold text-foreground">{trip?.name ?? "Trip"}</h1>
            {trip?.location && (
              <p className="text-xs text-muted-foreground">{trip.location}</p>
            )}
          </div>
        </div>
        <EditTripDialog tripId={tripId} trip={trip} onSuccess={() => refetch()} />
      </header>
      <div className="max-w-2xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {navItems.map(({ href, icon: Icon, label, badge }) => (
          <Link key={href} href={href}>
            <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-3 hover:border-primary/50 hover:bg-accent transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">{label}</span>
              {badge}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
