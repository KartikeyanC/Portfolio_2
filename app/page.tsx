import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Changelog } from "@/components/Changelog";
import { Dependencies } from "@/components/Dependencies";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Changelog />
        <Dependencies />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
