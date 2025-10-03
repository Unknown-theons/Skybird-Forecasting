export default function Footer() {
  return (
    <footer className="border-t bg-background/60">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 py-6 text-sm text-muted-foreground md:h-16 md:flex-row">
        <p>
          © {new Date().getFullYear()} WeatherComfort. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <a href="/about" className="hover:text-foreground">
            About
          </a>
          <a href="/model" className="hover:text-foreground">
            Model
          </a>
        </div>
      </div>
    </footer>
  );
}
