import { PropsWithChildren } from "react";

export default function Placeholder({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="mx-auto rounded-2xl border bg-card p-10 text-center shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This section is ready to be filled. Continue prompting to generate
          this page’s detailed contents.
        </p>
        {children}
      </div>
    </div>
  );
}
