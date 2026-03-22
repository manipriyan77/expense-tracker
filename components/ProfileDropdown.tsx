"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Pencil, User, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProfileDropdownProps {
  isCollapsed?: boolean;
}

export function ProfileDropdown({ isCollapsed = false }: ProfileDropdownProps) {
  const { user, signOut, updateProfile, loading } = useAuthStore();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    "User";
  const displayEmail = user?.email ?? "";

  // Generate initials from display name
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function openEdit() {
    setName(displayName === "User" ? "" : displayName);
    setEditOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    const result = await updateProfile({ name: name.trim() });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated");
      setEditOpen(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  const avatar = (
    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0 select-none">
      {initials || <User className="h-4 w-4" />}
    </div>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:outline-none",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? displayName : undefined}
          >
            {avatar}
            {!isCollapsed && (
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-sm font-medium truncate w-full leading-tight">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full leading-tight">
                  {displayEmail}
                </span>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{displayName}</span>
              <span className="text-xs text-muted-foreground truncate">{displayEmail}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openEdit} className="cursor-pointer">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-semibold">
                {initials || <User className="h-7 w-7" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={displayEmail}
                disabled
                className="text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
