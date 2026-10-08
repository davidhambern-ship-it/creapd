import React, { useEffect } from "react";
import { Loader2, UserPlus } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

const BERNA_SIGNUP_URL =
  "https://bernaverse.hireberna.app/?auth=signup&app=creapd";

export default function Register() {
  useEffect(() => {
    window.location.replace(BERNA_SIGNUP_URL);
  }, []);

  return (
    <AuthLayout
      icon={UserPlus}
      title="BERNAverse Sign-Up"
      subtitle="CREAPD accounts now begin in the BERNAverse."
    >
      <div className="text-center text-muted-foreground leading-relaxed">
        <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-primary" />
        Sending you to the global BERNAverse sign-up…
        <div className="mt-4">
          <a
            href={BERNA_SIGNUP_URL}
            className="font-medium text-primary hover:underline"
          >
            Continue to BERNAverse
          </a>
        </div>
      </div>
    </AuthLayout>
  );
}
