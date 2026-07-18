import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  Check,
  Copy,
  Link,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminRoster() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const tripIdNum = parseInt(tripId ?? "0", 10);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", startingHandicap: "0" });
  const [editForm, setEditForm] = useState({ name: "", email: "", startingHandicap: "0" });
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: invites = [], isLoading } = trpc.invites.list.useQuery(
    { tripId: tripIdNum },
    { enabled: tripIdNum > 0 }
  );

  const { data: trip } = trpc.trips.get.useQuery(
    { id: tripIdNum },
    { enabled: tripIdNum > 0 }
  );

  const createMutation = trpc.invites.create.useMutation({
    onSuccess: () => {
      utils.invites.list.invalidate({ tripId: tripIdNum });
      setAddOpen(false);
      setForm({ name: "", email: "", startingHandicap: "0" });
      toast.success("Player added to roster");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.invites.update.useMutation({
    onSuccess: () => {
      utils.invites.list.invalidate({ tripId: tripIdNum });
      setEditOpen(false);
      toast.success("Player updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = trpc.invites.revoke.useMutation({
    onSuccess: () => {
      utils.invites.list.invalidate({ tripId: tripIdNum });
      toast.success("Invite revoked");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.invites.delete.useMutation({
    onSuccess: () => {
      utils.invites.list.invalidate({ tripId: tripIdNum });
      toast.success("Player removed from roster");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendEmailMutation = trpc.invites.sendEmail.useMutation({
    onSuccess: () => toast.success("Invite email sent!"),
    onError: (e) => toast.error(`Email failed: ${e.message}`),
  });

  const regenerateMutation = trpc.invites.regenerate.useMutation({
    onSuccess: (data) => {
      utils.invites.list.invalidate({ tripId: tripIdNum });
      copyToClipboard(data.inviteUrl, -1);
      toast.success("New invite link generated and copied");
    },
    onError: (e) => toast.error(e.message),
  });

  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Invite link copied to clipboard");
    } catch {
      toast.error("Failed to copy — please copy manually");
    }
  };

  const getInviteUrl = (token: string) => `${window.location.origin}/join/${token}`;

  const handleAdd = () => {
    createMutation.mutate({
      tripId: tripIdNum,
      name: form.name.trim(),
      email: form.email.trim(),
      startingHandicap: parseFloat(form.startingHandicap) || 0,
      origin: window.location.origin,
    });
  };

  const handleEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      startingHandicap: parseFloat(editForm.startingHandicap) || 0,
    });
  };

  const openEdit = (invite: typeof invites[0]) => {
    setEditingId(invite.id);
    setEditForm({
      name: invite.name,
      email: invite.email,
      startingHandicap: String(invite.startingHandicap),
    });
    setEditOpen(true);
  };

  const statusBadge = (status: string) => {
    if (status === "accepted") return <Badge className="bg-emerald-600 text-white"><UserCheck className="w-3 h-3 mr-1" />Joined</Badge>;
    if (status === "revoked") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Revoked</Badge>;
    return <Badge variant="outline" className="border-amber-500 text-amber-400"><Mail className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const pending = invites.filter((i) => i.status === "pending").length;
  const accepted = invites.filter((i) => i.status === "accepted").length;

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(`/admin/trips/${tripIdNum}`)}
              className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1"
            >
              ← Back to Trip
            </button>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" />
              Player Roster
            </h1>
            {trip && (
              <p className="text-muted-foreground text-sm mt-1">{trip.name}</p>
            )}
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add Player to Roster</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="e.g. John Smith"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Starting Handicap</Label>
                  <Input
                    type="number"
                    min="0"
                    max="54"
                    step="0.1"
                    placeholder="0"
                    value={form.startingHandicap}
                    onChange={(e) => setForm({ ...form, startingHandicap: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  An invite link will be generated. Copy it and send via WhatsApp, email, or SMS.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleAdd}
                    disabled={!form.name || !form.email || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Adding..." : "Add & Generate Link"}
                  </Button>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{invites.length}</div>
              <div className="text-xs text-muted-foreground">Total Invited</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{accepted}</div>
              <div className="text-xs text-muted-foreground">Joined</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
        </div>

        {/* Roster Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Roster</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading roster...</div>
            ) : invites.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No players added yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Click "Add Player" to build your roster.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {invites.map((invite) => (
                  <div key={invite.id} className="px-4 py-3 space-y-2">
                    {/* Row 1: Name + status badge + dropdown (always visible) */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {invite.nickname ? (
                              <>{invite.nickname} <span className="font-normal text-muted-foreground text-xs">({invite.name})</span></>
                            ) : invite.name}
                          </span>
                          {statusBadge(invite.status)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                          {invite.email && !invite.email.endsWith(".noemail@golftrip.local") && (
                            <div>{invite.email}</div>
                          )}
                          <div>HCP {invite.startingHandicap}</div>
                        </div>
                      </div>
                      {/* Actions dropdown — always top-right */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="shrink-0 w-8 h-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem onClick={() => openEdit(invite)}>
                            Edit Details
                          </DropdownMenuItem>
                          {invite.status !== "revoked" && (
                            <DropdownMenuItem
                              onClick={() => regenerateMutation.mutate({ id: invite.id, origin: window.location.origin })}
                            >
                              <RefreshCw className="w-3 h-3 mr-2" />
                              Regenerate Link
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {invite.status === "pending" && (
                            <DropdownMenuItem
                              className="text-amber-500"
                              onClick={() => revokeMutation.mutate({ id: invite.id })}
                            >
                              <XCircle className="w-3 h-3 mr-2" />
                              Revoke Invite
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => deleteMutation.mutate({ id: invite.id })}
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Remove from Roster
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Row 2: Copy link + Email buttons */}
                    {invite.status !== "revoked" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs flex-1"
                          onClick={() => copyToClipboard(getInviteUrl(invite.token), invite.id)}
                        >
                          {copiedId === invite.id ? (
                            <><Check className="w-3 h-3 mr-1 text-emerald-400" />Copied</>
                          ) : (
                            <><Copy className="w-3 h-3 mr-1" />Copy Link</>
                          )}
                        </Button>
                        {invite.email && !invite.email.endsWith(".noemail@golftrip.local") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs flex-1 text-emerald-400 border-emerald-600 hover:bg-emerald-900"
                            onClick={() => sendEmailMutation.mutate({ inviteId: invite.id, origin: window.location.origin })}
                            disabled={sendEmailMutation.isPending}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Link className="w-4 h-4 text-emerald-400" />
              How Invite Links Work
            </h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Add each player to the roster with their name, email, and starting handicap.</li>
              <li>Click <strong className="text-foreground">Copy Link</strong> next to their name.</li>
              <li>Paste the link into WhatsApp, SMS, or email and send it to the player.</li>
              <li>When they tap the link, they see a personalised join page and log in with their Manus account.</li>
              <li>They are automatically added to the trip — their status changes to <strong className="text-emerald-400">Joined</strong>.</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label>Starting Handicap</Label>
              <Input
                type="number"
                min="0"
                max="54"
                step="0.1"
                value={editForm.startingHandicap}
                onChange={(e) => setEditForm({ ...editForm, startingHandicap: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
