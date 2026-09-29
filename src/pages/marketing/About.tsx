import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, GraduationCap, Laptop2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaBand, MarketingLayout } from "@/components/marketing/MarketingLayout";
import boardroomImage from "@/assets/intro-boardroom.jpg";

const arms = [
  { name: "Advisory", icon: Building2, copy: "Governance framework design, compliance gap assessments, corporate structuring, transaction support, and regulatory advisory." },
  { name: "Training", icon: GraduationCap, copy: "Good Governance Academy, AML/CFT compliance training, board and director development, and governance capacity building across Africa." },
  { name: "Technology", icon: Laptop2, copy: "The Lexora platform: five modules, four pillars, one system of record. GRC Health Score, client portals, and full operational governance." },
];

const pillars = [
  ["People", "Stakeholders, HR, board"],
  ["Projects", "Delivery, CRM, contracts"],
  ["Processes", "GRC, compliance, AML"],
  ["Performance", "Finance, reporting, ESG"],
];

const people = [
  {
    id: "rudo", name: "Rudo Barbra Sibanda", role: "Managing Director",
    title: "Managing Partner and Co-Founder, Upendo Tech Limited | Founder, Lexora Africa",
    summary: "International business lawyer, entrepreneur, and governance strategist with deep expertise across legal, fiduciary, and regulatory advisory.",
    badges: ["FCIS (CGISA)", "LLM Extractive Industries", "LLB", "RTCA Advisor"],
    quote: "The shortest distance between any two points is innovation.",
    bio: [
      "A distinguished international business and projects lawyer, entrepreneur, and corporate trainer based in Kigali, Rwanda. With a career spanning over a decade across multiple continents, she is widely recognised for her strategic leadership and transformative impact across legal, corporate, and training landscapes.",
      "She holds an LLB from the University of Botswana and an LLM in Extractive Industries Law from the University of Pretoria. She is also a Fellow of the Chartered Governance Institute of Southern Africa (CGISA), holding a professional qualification in corporate governance practice.",
      "Her legal and executive career has seen her excel across diverse sectors and geographies. She has held legal roles at two DLA Piper firms in Botswana and Zimbabwe, and led strategic initiatives across Africa, North America, the UAE, and Europe. Her experience spans the extractive industries, energy, infrastructure development, trade, technology, financial services, and manufacturing sectors, where she has consistently demonstrated expertise in legal and transaction advisory, business development, training, and corporate governance.",
      "As Managing Partner and Co-Founder of Upendo Tech, a licensed Trust and Corporate Services Provider regulated by the National Bank of Rwanda, she is at the forefront of reshaping Africa's corporate ecosystem. Her work focuses on integrating technology with governance, offering innovative solutions to corporates through corporate advisory, training, and regulatory compliance.",
      "She is also the Founder of Lexora Africa, a purpose-built business management software that unifies people, projects, and processes, equipping organisations with a single source of truth for data-driven decisions, sustainable enterprise growth, and the building of legacies that last.",
    ],
    listLabel: "Professional affiliations",
    list: ["Advisor, Rwanda Trust Companies Association (RTCA) Executive Committee", "Institute of Directors in Southern Africa", "Law Society of Botswana", "Chartered Governance Institute of Southern Africa", "Toastmasters International", "Rotary International"],
    email: "rudobarbra@lexoraafrica.com", phone: "+250 793 369 842",
  },
  {
    id: "juliet", name: "Juliet Kelechi", role: "Chief Technology Officer",
    title: "Chief Technology Officer, Lexora Africa",
    summary: "Full-stack architect leading the design, development, and delivery of the Lexora integrated business management system.",
    badges: ["Full-Stack Engineering", "Platform Architecture"],
    bio: [
      "Full-stack architect and platform engineer leading the design, development, and delivery of the Lexora integrated business management system. Responsible for translating complex governance, compliance, and operational workflows into an intuitive, scalable platform that serves regulated businesses across Africa.",
      "Juliet leads the end-to-end technical execution of the Lexora platform, from system architecture and database design through front-end experience and deployment. Her work ensures that five integrated modules, spanning AML/KYC, projects, finance, GRC, and HR, operate as a single, coherent system of record.",
    ],
    listLabel: "Core responsibilities",
    list: ["Platform architecture and technical roadmap", "Module development across all five system pillars", "Client portal and integration layer design", "Security, data integrity, and compliance infrastructure"],
    email: "juliet@lexoraafrica.com",
  },
  {
    id: "ivy", name: "Ivy Kibaara", role: "Business Development Associate",
    title: "Business Development Associate, Lexora Africa",
    summary: "Driving client acquisition, partnership development, and market expansion across East and Southern African markets.",
    badges: ["Business Development", "Market Expansion"],
    bio: [
      "Driving client acquisition, partnership development, and market expansion across East and Southern African markets. Ivy works at the intersection of advisory services and technology adoption, helping organisations understand how Lexora can transform their governance and operational infrastructure.",
      "She plays a key role in building relationships with prospective clients, managing the sales pipeline, and supporting the advisory team in scoping engagement opportunities across multiple sectors and jurisdictions.",
    ],
    listLabel: "Core responsibilities",
    list: ["Client acquisition and relationship management", "Partnership development across Africa", "Market research and expansion strategy", "Advisory engagement support and scoping"],
    email: "ivy@lexoraafrica.com",
  },
];

const affiliations = ["Rwanda Development Board", "Kigali International Financial Centre", "Chartered Governance Institute", "Capital Markets Authority", "National Bank of Rwanda", "ALU Ventures Lab", "DLA Piper Africa", "Rwanda Revenue Authority"];

export default function About() {
  const [selected, setSelected] = useState<string | null>(null);
  const person = people.find((item) => item.id === selected);
  const showProfile = (id: string) => { setSelected(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const back = () => { setSelected(null); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return <MarketingLayout>
    {person ? <>
      <section className="min-h-[70vh] px-5 pb-20 pt-20 sm:px-8 sm:pt-28">
        <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[320px_1fr] lg:gap-14">
          <div className="marketing-enter">
            <div className="flex aspect-[4/5] items-end justify-center overflow-hidden rounded-lg border border-intro-foreground/10 bg-intro-surface pb-10" aria-hidden="true"><span className="font-display text-8xl text-intro-highlight/70">{person.name.split(" ").map((word) => word[0]).join("")}</span></div>
            <div className="mt-5 flex flex-wrap gap-2">{person.badges.map((badge) => <span key={badge} className="rounded border border-intro-accent/25 bg-intro-accent/10 px-2.5 py-1 text-xs text-intro-highlight">{badge}</span>)}</div>
          </div>
          <div className="marketing-enter marketing-delay">
            <Button variant="ghost" className="mb-8 -ml-3 text-intro-accent hover:bg-intro-foreground/10 hover:text-intro-foreground" onClick={back}><ArrowLeft size={16} /> Back to About</Button>
            <h1 className="font-display text-4xl sm:text-5xl">{person.name}</h1>
            <p className="mt-3 text-sm font-semibold text-intro-accent">{person.title}</p>
            {person.quote && <blockquote className="mt-5 border-l-2 border-intro-accent pl-4 text-sm italic text-intro-muted">“{person.quote}”</blockquote>}
            <div className="mt-8 space-y-5 text-sm leading-7 text-intro-muted">{person.bio.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            <h2 className="mt-9 text-xs font-bold uppercase text-intro-accent">{person.listLabel}</h2>
            <ul className="mt-4 space-y-3">{person.list.map((item) => <li key={item} className="flex gap-3 text-sm text-intro-muted"><span className="text-intro-accent">✓</span>{item}</li>)}</ul>
            <div className="mt-9 flex flex-wrap gap-x-8 gap-y-2 border-t border-intro-foreground/10 pt-6 text-sm text-intro-muted"><a className="inline-flex items-center gap-2 hover:text-intro-foreground" href={`mailto:${person.email}`}><Mail size={15}/>{person.email}</a>{person.phone && <a className="hover:text-intro-foreground" href={`tel:${person.phone.replace(/\s/g, "")}`}>{person.phone}</a>}</div>
          </div>
        </div>
      </section>
      <CtaBand title="Start building your governance infrastructure" copy="Explore the platform, seek advisory support, or request a tailored walkthrough." />
    </> : <>
      <section className="marketing-hero border-b border-intro-foreground/10 px-5 pb-14 pt-20 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-[1100px] text-center"><p className="marketing-enter text-xs font-bold uppercase text-intro-accent">About</p><h1 className="marketing-enter marketing-delay mx-auto mt-5 max-w-4xl font-display text-4xl leading-tight sm:text-6xl">Governance infrastructure for Africa's next generation of businesses</h1></div>
      </section>
      <section className="bg-intro-soft px-5 py-12 text-intro-soft-foreground sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-[1100px] items-center gap-10 lg:grid-cols-2">
          <img src={boardroomImage} alt="African business leaders in a boardroom" className="aspect-[4/3] w-full rounded-lg object-cover" />
          <div><h2 className="font-display text-3xl">Where we started</h2><div className="mt-5 space-y-4 text-sm leading-7 text-intro-soft-muted"><p>Lexora was born from a career spent inside the gap. Years of advising businesses across Southern and East Africa revealed a pattern: organisations kept hitting the same structural ceiling. They had ambition, capital, and talent, but lacked the operational infrastructure to convert those into durable, auditable, investor-ready businesses.</p><p>The available tools were built elsewhere, for different regulatory environments, different ownership structures, and different growth trajectories. So we built our own. Not a consultancy with a login page, but a platform designed from first principles for the way African businesses actually run.</p><p>Headquartered in Kigali, Rwanda. Operating across East and Southern Africa, the UK, and Gulf markets.</p></div><div className="mt-6 flex flex-wrap gap-3"><Button asChild className="bg-intro-primary text-intro-foreground"><Link to="/contact">Get in touch <ArrowRight size={16}/></Link></Button><Button asChild variant="outline" className="border-intro-soft-border bg-intro-soft-raised text-intro-soft-foreground"><Link to="/advisory">Our services</Link></Button></div></div>
        </div>
      </section>
      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-[1100px]"><div className="mx-auto max-w-[800px] text-center"><p className="text-xs font-bold uppercase text-intro-accent">Our why</p><h2 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">African businesses deserve infrastructure designed for how they actually operate.</h2><p className="mt-6 text-sm leading-7 text-intro-muted">The firm is headquartered in Kigali, Rwanda and operates across advisory, training, and technology. The advisory practice designs governance and compliance frameworks. The training arm builds the internal capacity for organisations to sustain those frameworks. And the technology platform operationalises everything into a system that codifies institutional knowledge, quantifies organisational health, and makes compliance a driver of growth.</p><p className="mt-4 text-sm leading-7 text-intro-muted">The platform is structured around four pillars: people, projects, processes, and performance. Five modules cover the full operational surface of a governance-focused organisation. The proprietary GRC Health Score quantifies compliance standing, governance health, and risk management effectiveness in a single metric.</p></div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">{arms.map(({name, icon: Icon, copy}) => <div key={name} className="rounded-lg border border-intro-foreground/10 bg-intro-surface p-7 text-center"><Icon className="mx-auto h-7 w-7 text-intro-accent"/><h3 className="mt-4 font-semibold">{name}</h3><p className="mt-2 text-xs leading-6 text-intro-muted">{copy}</p></div>)}</div>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-intro-foreground/10 bg-intro-foreground/10 md:grid-cols-4">{pillars.map(([name, copy]) => <div key={name} className="bg-intro-surface px-4 py-6 text-center"><h3 className="text-sm font-semibold">{name}</h3><p className="mt-1 text-xs text-intro-muted">{copy}</p></div>)}</div>
        </div>
      </section>
      <section className="bg-intro-soft px-5 py-20 text-intro-soft-foreground sm:px-8"><div className="mx-auto max-w-[1100px]"><div className="text-center"><p className="text-xs font-bold uppercase text-intro-primary">Leadership</p><h2 className="mt-3 font-display text-4xl">The team behind the platform</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{people.map((member) => <Button key={member.id} variant="ghost" onClick={() => showProfile(member.id)} className="group relative flex h-[360px] w-full flex-col items-start justify-end overflow-hidden rounded-lg border border-intro-soft-border bg-intro px-7 pb-7 pt-6 text-left text-intro-foreground transition-transform hover:-translate-y-1 hover:bg-intro-surface hover:text-intro-foreground"><span aria-hidden="true" className="absolute right-5 top-5 font-display text-7xl text-intro-highlight/20">{member.name.split(" ").map((word) => word[0]).join("")}</span><span className="relative block w-full whitespace-normal"><span className="mb-4 block h-0.5 w-9 bg-intro-accent"/><span className="block font-display text-2xl">{member.name}</span><span className="mt-1 block text-xs font-semibold text-intro-accent">{member.role}</span><span className="mt-3 block text-xs leading-5 text-intro-muted">{member.summary}</span><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-intro-highlight">View profile <ArrowRight size={14}/></span></span></Button>)}</div></div></section>
      <section className="border-t border-intro-foreground/10 px-5 py-14 sm:px-8"><div className="mx-auto max-w-[1100px]"><h2 className="text-center text-xs font-bold uppercase text-intro-muted">Our partners and affiliations</h2><div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">{affiliations.map((name) => <div key={name} className="flex min-h-20 items-center justify-center border-t border-intro-foreground/10 px-3 text-center text-sm font-semibold text-intro-muted">{name}</div>)}</div></div></section>
      <CtaBand title="Start building your governance infrastructure" copy="Whether you are exploring the platform, need advisory support, or want a personalised walkthrough, we are here." />
    </>}
  </MarketingLayout>;
}