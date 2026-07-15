"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type LogoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LogoutDialog({ open, onOpenChange }: LogoutDialogProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent aria-describedby="logout-dialog-description">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-700">
            <SignOut className="size-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle>Log out of GaugeHow?</DialogTitle>
            <DialogDescription id="logout-dialog-description">
              You&apos;ll need to sign in again to get back to your courses and progress. Any
              unsaved work on this page will be lost.
            </DialogDescription>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" size="sm" onClick={handleLogout} disabled={pending}>
            {pending ? "Logging out..." : "Log out"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
