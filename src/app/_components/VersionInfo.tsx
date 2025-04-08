"use client";

import { type ReactNode, useEffect } from "react";

interface VersionInfoProps {
  children?: ReactNode;
}

export function VersionInfo({ children }: VersionInfoProps) {
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

  useEffect(() => {
    // Format the build time to be more readable
    const formattedBuildTime = new Date(buildTime ?? '').toLocaleString();
    
    console.log(
      `%cCleaning Market%c\n\n🔖 Version: ${version}\n🕒 Build: ${formattedBuildTime}`,
      'background: #2e026d; color: white; padding: 8px 12px; border-radius: 4px; font-size: 14px; font-weight: bold;',
      'color: #666; font-size: 13px; padding: 8px 0;'
    );
  }, [version, buildTime]);

  return (
    <div className="hidden" aria-hidden="true">
      <div id="version-info">
        <span data-version={version} data-build-time={buildTime} />
      </div>
      {children}
    </div>
  );
} 