import HeroSection from "./hero-section";
import FeaturesOne from "./features-one";
import Testimonials from "./testimonials";
import CallToAction from "./call-to-action";
import FAQs from "./faqs";
import Footer from "./footer";
import CustomClerkPricing from "@/components/custom-clerk-pricing";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <FeaturesOne />
      <section className="bg-muted/50 py-16 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 mx-auto max-w-2xl space-y-6 text-center">
              <h1 className="text-center text-4xl font-semibold lg:text-5xl">Simple Process, Powerful Results</h1>
              <p>Join the HTW community of event hosts who've streamlined their planning process. From idea to execution in record time.</p>
          </div>
          {/* <CustomClerkPricing /> */}
        </div>
      </section>
      <Testimonials />
      <CallToAction />
      <FAQs />
      <Footer />
    </div>
  );
}
