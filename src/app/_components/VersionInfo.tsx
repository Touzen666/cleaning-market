"use client";

import { type ReactNode, useEffect } from "react";

interface VersionInfoProps {
  children?: ReactNode;
}

export function VersionInfo({ children }: VersionInfoProps) {
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

  useEffect(() => {
    console.log(
      `%cCleaning Market App%c\nVersion: ${version}\nBuild Time: ${buildTime}`,
      'background: #2e026d; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;',
      'color: #666; margin-top: 5px; display: block;'
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