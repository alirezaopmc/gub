export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col md:bg-canvas">
      <div className="flex min-h-dvh flex-1 flex-col md:items-center md:justify-start md:p-4">
        <div className="flex w-full min-w-0 min-h-0 flex-1 flex-col md:max-w-(--width-app-shell) md:flex-1 md:overflow-hidden md:rounded-3xl md:border md:border-border md:bg-background md:shadow-2xl">
          <div className="flex h-dvh max-h-dvh min-h-0 w-full flex-1 flex-col overflow-y-auto md:h-auto md:max-h-none md:min-h-0 md:flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
