"use client";

import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/firebase/auth-provider";
import { describeFirebaseError } from "@/lib/firebase/errors";

/** Starts (or resumes) an anonymous sandbox session and opens the app. */
export function ExploreDemoButton() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await signIn();
      router.push("/app");
    } catch (error) {
      toast.error("Could not start the demo", {
        description: describeFirebaseError(error),
      });
      setPending(false);
    }
  }

  return (
    <Button
      size="lg"
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending}
      className="h-11 px-6 text-base"
    >
      {pending ? (
        <>
          <Loader2Icon aria-hidden className="animate-spin" />
          Starting your sandbox…
        </>
      ) : (
        <>
          Explore the demo
          <ArrowRightIcon aria-hidden />
        </>
      )}
    </Button>
  );
}
