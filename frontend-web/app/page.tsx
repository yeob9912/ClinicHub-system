import Hero from "../components/Hero";
import TrustFeatures from "../components/TrustFeatures";
import NearbyPharmacies from "../components/NearbyPharmacies";
import CTA from "../components/CTA";
import LocationIndicator from "../components/LocationIndicator";

export default function Home() {
  return (
    <>
      <LocationIndicator />
      <Hero />
      <TrustFeatures />
      <NearbyPharmacies />
      <CTA />
    </>
  );
}
