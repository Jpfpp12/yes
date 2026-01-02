import { useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Cuboid, Layers, Cog } from "lucide-react";
import ServiceCard from "@/components/ServiceCard";

export default function Index() {
  const { user, isAuthenticated, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-black flex items-center justify-center">
              <span className="text-white font-bold text-xl uppercase tracking-tighter">
                FS
              </span>
            </div>
            <span className="text-xl font-bold font-mono tracking-tighter uppercase">
              FUSIONSTD
            </span>
          </div>

          <nav className="flex items-center space-x-6 hidden md:flex">
            <a
              href="#services"
              className="text-sm font-medium hover:text-primary transition-colors uppercase tracking-widest"
            >
              Services
            </a>
            <a
              href="#about"
              className="text-sm font-medium hover:text-primary transition-colors uppercase tracking-widest"
            >
              About
            </a>
            <a
              href="#contact"
              className="text-sm font-medium hover:text-primary transition-colors uppercase tracking-widest"
            >
              Contact
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium hidden md:block uppercase tracking-wider">
                  {user?.fullName}
                </span>
                {user?.userType === "company" && (
                  <Link to="/admin">
                    <Button variant="ghost" size="icon">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="icon" onClick={() => signOut()}>
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/signin" className="text-sm font-medium uppercase tracking-widest hover:text-primary">
                  Sign In
                </Link>
                <Link to="/signup">
                  <Button className="rounded-none font-bold uppercase tracking-widest">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-black text-white py-32 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] border-[20px] border-white transform rotate-12 translate-x-1/3 -translate-y-1/4"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary rounded-full blur-[100px] opacity-40"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl md:text-8xl font-bold font-mono tracking-tighter mb-6 leading-none">
              MATERIALIZE<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">YOUR IDEAS</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto font-light">
              Professional 3D printing services for rapid prototyping and industrial manufacturing.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/quote">
                <Button size="lg" className="h-16 px-10 text-xl font-bold uppercase tracking-widest rounded-none bg-primary hover:bg-orange-600 border-2 border-primary">
                  Get Instant Quote
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-16 px-10 text-xl font-bold uppercase tracking-widest rounded-none border-2 border-white text-black hover:bg-white hover:text-black bg-transparent">
                Explore Services
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-16 px-2 border-b border-black pb-4">
            <h2 className="text-4xl font-bold font-mono uppercase tracking-tighter">Our Services</h2>
            <span className="font-mono text-sm uppercase tracking-widest text-gray-500">Precision Engineering</span>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ServiceCard
              icon={Cuboid}
              title="Rapid Prototyping"
              description="Fast iteration for product development. Get your designs from CAD to physical model in as fast as 24 hours."
            />
            <ServiceCard
              icon={Layers}
              title="Production Runs"
              description="Scalable manufacturing for small to medium batches. Consistent quality across thousands of parts."
            />
            <ServiceCard
              icon={Cog}
              title="Art & Custom"
              description="High precision printing for unique artistic designs, custom figurines, and complex geometries."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 border-t border-gray-800">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4">
            <span className="text-2xl font-bold font-mono tracking-tighter uppercase">FUSIONSTD</span>
          </div>
          <p className="text-gray-500 text-sm mb-8">© 2024 Fusion Starter. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
