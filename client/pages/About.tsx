import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Linkedin } from "lucide-react";

const team = [
  { name: "Mohamed Hussien", role: "Machine Learning Engineer", img: "https://randomuser.me/api/portraits/men/11.jpg", initials: "MH" },
  { name: "Yousef Tarek", role: "Full Stack Engineer", img: "https://randomuser.me/api/portraits/men/22.jpg", initials: "YT" },
  { name: "Mohannad Ezz", role: "Data Scientist", img: "https://randomuser.me/api/portraits/men/33.jpg", initials: "ME" },
  { name: "Omar Alaa", role: "BackEnd Engineer", img: "https://randomuser.me/api/portraits/men/44.jpg", initials: "OA" },
  { name: "Abdelrahman Wael", role: "Full Stack Engineer", img: "https://randomuser.me/api/portraits/men/55.jpg", initials: "AW" },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function emailFor(name: string, role: string) {
  const base = name.trim().length ? name : role;
  const slug = slugify(base).replace(/-/g, ".");
  return `${slug || "team"}@weathercomfort.app`;
}

function linkedinFor(name: string, role: string) {
  const base = name.trim().length ? name : role;
  const slug = slugify(base);
  return `https://www.linkedin.com/in/${slug || "weathercomfort-team"}`;
}

export default function About() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2">About WeatherComfort</h1>
      <p className="mb-8 max-w-3xl text-muted-foreground">
        Our mission is to deliver clear, personalized weather insights using reliable data and modern design. Meet the team building it.
      </p>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {team.map((m) => {
          const email = emailFor(m.name, m.role);
          const linkedin = linkedinFor(m.name, m.role);
          return (
            <Card key={`${m.name}-${m.role}`} className="transition-all hover:shadow-soft-lg flex flex-col">
              <CardHeader className="items-center text-center pb-2">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={m.img} alt={m.name || m.role} />
                  <AvatarFallback>{m.initials}</AvatarFallback>
                </Avatar>
              </CardHeader>
              <CardContent className="text-center">
                <CardTitle className="text-base font-semibold leading-tight min-h-6">
                  {m.name || ""}
                </CardTitle>
                <div className={`mt-1 ${m.name === "Mohamed Hussien" ? "text-xs" : "text-sm"} text-muted-foreground font-semibold`}>{m.role}</div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Button asChild variant="secondary" size="sm" className="gap-2">
                    <a href={`mailto:${email}`}>
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </a>
                  </Button>
                  <Button asChild variant="secondary" size="sm" className="gap-2">
                    <a href={linkedin} target="_blank" rel="noreferrer noopener">
                      <Linkedin className="h-4 w-4" />
                      <span>LinkedIn</span>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
