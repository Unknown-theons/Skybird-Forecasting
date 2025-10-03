import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Linkedin } from "lucide-react";

const team = [
  // Example of explicit linkedin handle added
  { name: "Mohamed Hussien", role: "Machine Learning Engineer", img: "../../public/assets/MohammedHussien.jpg", initials: "MH", email: "mohamedyahussien@gmail.com", linkedin: "/mkhussien/" },
  { name: "Yousef Tarek", role: "Full Stack Engineer", img: "../../public/assets/Youssef.png", initials: "YT", email: "Yousseftarek.shaarawy1087@gmail.com", linkedin: "/youssef-tarek-shaarawy-912a2b305/" },
  { name: "Mohannad Ezz", role: "Data Scientist", img: "../../public/assets/Moahnned.png", initials: "ME", email: "Mohannadezzzahra@gmail.com", linkedin: "/mohannad-zahra-454491290/" },
  { name: "Omar Alaa", role: "Back End Engineer", img: "../../public/assets/Omar Alaa.png", initials: "OW", email: "omar.alaa.abbas05@gmail.com", linkedin: "/omar-alaa-abbas1337/" },
  // Example of explicit email and linkedin handle
  { name: "Abdelrahman Wael", role: "Full Stack Engineer", img: "../../public/assets/Abdelrhaman.png", initials: "AW", email: "abdelrhamanwael8@gmail.com", linkedin: "/abdelrhaman-wael-mohammed-790171366/" }, 
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// function emailFor(name: string, role: string) {
//   const base = name.trim().length ? name : role;
//   const slug = slugify(base).replace(/-/g, ".");
//   return `${slug || "team"}@gmail.com`;
// }
function emailFor(member: typeof team[number]) {
  if (member.email) {
    return member.email; // Use the explicit email if provided
  }
  
  // Fallback to generic generation
  const base = member.name.trim().length ? member.name : member.role;
  const slug = slugify(base).replace(/-/g, ".");
  return `${slug || "team"}@gmail.com`;
}


function linkedinFor(member: typeof team[number]) {
  if (member.linkedin) {
    // If an explicit handle is provided, ensure the base URL is prepended
    return `https://www.linkedin.com/in/${member.linkedin}`;
  }

  // Fallback to generic generation
  const base = member.name.trim().length ? member.name : member.role;
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
          // ⚠️ STEP 4: Pass the whole member object 'm' to the functions
          const email = emailFor(m);
          const linkedin = linkedinFor(m);
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
