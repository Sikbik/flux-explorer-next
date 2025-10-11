"use client";

import { Heart, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Footer() {
  const [copied, setCopied] = useState(false);
  const donationAddress = "t3aYE1U7yncYeCoAGmfpbEXo3dbQSegZCSP";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(donationAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <footer className="border-t bg-card">
      <div className="container py-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Built with love message */}
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            Built with <Heart className="h-4 w-4 text-red-500 fill-red-500 inline" /> for the Flux community
          </p>

          {/* Donation section */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Donations help development and hosting costs
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
              <code className="text-xs font-mono text-foreground break-all">
                {donationAddress}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0 flex-shrink-0"
                title="Copy address"
              >
                {copied ? (
                  <span className="text-xs text-green-500">✓</span>
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            <a
              href="https://runonflux.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Flux Network
            </a>
            <span>•</span>
            <a
              href="https://github.com/Sikbik/flux-explorer-next"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              GitHub
            </a>
            <span>•</span>
            <a
              href="https://github.com/Sikbik/flux-explorer-next/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Report Issue
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
