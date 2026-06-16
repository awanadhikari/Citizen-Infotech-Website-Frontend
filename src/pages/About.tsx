import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import GradientOrbs from "@/components/GradientOrbs";
import { pagesApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Lightbulb, Users, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const officePosition: [number, number] = [
  27.698018339266977,
  85.33781223481472,
];

const values = [
  {
    title: "Purposeful innovation",
    desc: "We use technology with clear intent of solving real problems, improving workflows, and creating systems that make everyday work easier.",
    icon: Lightbulb,
  },
  {
    title: "Built around people",
    desc: "From healthcare workers to administrators and end users, we design solutions that are practical, usable, and ready for real-world adoption.",
    icon: Users,
  },
  {
    title: "Reliable by design",
    desc: "We build systems with security, scalability, support, and long-term use in mind, so organizations can depend on them as they grow.",
    icon: ShieldCheck,
  },
];

const milestones = [
  { year: "2012", text: "Founded in Kathmandu with a focus on IT consulting" },
  { year: "2016", text: "Expanded into healthcare technology solutions" },
  { year: "2020", text: "Launched AI-powered CDSS and EHR/EMR systems" },
  { year: "2024", text: "Serving 80+ clients across multiple sectors" },
];

const About = () => {
  const { data: aboutPage } = useQuery({
    queryKey: ["page", "about"],
    queryFn: () => pagesApi.get("about"),
    retry: false,
  });

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden section-padding !pt-28">
        <GradientOrbs />
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="container-tight relative">
          <AnimatedSection>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-medium uppercase tracking-widest text-primary"
            >
              About us
            </motion.p>

            <h1 className="mt-3 max-w-2xl font-heading text-4xl font-bold text-foreground md:text-5xl">
              A team united by purpose, not just
              <span className="gradient-text"> technology.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              {aboutPage?.content ||
                "Citizen Infotech provides innovative, scalable solutions to drive business growth and efficiency."}
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* STORY */}
      <section className="section-padding !py-12">
        <div className="container-tight">
          <AnimatedSection>
            <div className="glass-card-hover rounded-2xl p-8 md:p-12">
              <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
                Purposeful systems for modern healthcare.
              </h2>

              <div className="mt-6 space-y-4 text-sm text-muted-foreground">
                <p>
                  CITIZEN INFOTECH PVT. LTD. builds intelligent digital systems
                  for healthcare and growing organizations.
                </p>
                <p>
                  We develop EMR, EHMIS, MCHMS, and CDSS platforms for better
                  healthcare operations.
                </p>
                <p>
                  Our solutions combine real workflows with modern AI systems.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="section-padding !py-12">
        <div className="container-tight">
          <AnimatedSection>
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              Journey
            </p>
            <h2 className="mt-3 font-heading text-2xl font-bold text-foreground">
              Key milestones
            </h2>
          </AnimatedSection>

          <div className="relative mt-10 ml-4">
            <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-primary/50 to-transparent" />

            {milestones.map((m, i) => (
              <AnimatedSection key={m.year} delay={i * 0.12}>
                <div className="relative mb-8 pl-8">
                  <div className="absolute left-0 top-1 -translate-x-1/2">
                    <div className="h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  </div>

                  <span className="text-xs font-bold text-primary">
                    {m.year}
                  </span>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {m.text}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="section-padding !py-12">
        <div className="container-tight grid gap-6 md:grid-cols-3">
          {values.map((v, i) => (
            <AnimatedSection key={v.title} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                className="glass-card-hover rounded-xl p-6 h-full"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <v.icon size={18} className="text-primary" />
                </div>

                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {v.title}
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  {v.desc}
                </p>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* 📍 GOOGLE MAPS */}
      <section className="section-padding !py-12">
        <div className="container-tight">
          <AnimatedSection>
            <div className="mb-6 text-center">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                Visit Us
              </p>

              <h2 className="mt-3 font-heading text-2xl font-bold text-foreground">
                Our Location
              </h2>

              <p className="mt-2 text-muted-foreground">
                Kathmandu, Nepal
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
              <iframe
                title="Citizen Infotech Location"
                width="100%"
                height="500"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=27.698018339266977,85.33781223481472&z=17&output=embed`}
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <AnimatedSection className="section-padding !py-16">
        <div className="container-tight">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-10 text-center">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Have a system to build?
            </h2>

            <p className="mt-2 text-muted-foreground">
              Tell us what you're working on. We'll get back within one business day.
            </p>

            <Link
              to="/contact"
              className="group mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:shadow-lg hover:shadow-primary/20"
            >
              Get in touch
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </AnimatedSection>
    </Layout>
  );
};

export default About;