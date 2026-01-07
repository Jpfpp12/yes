import { useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Box, Zap, Settings } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Index() {
  const servicesRef = useRef<HTMLElement>(null);
  const { user, isAuthenticated, signOut } = useAuth();
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  // Vertical translation using vh to keep text centered/lower in viewport during scroll
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  // Precise adjustment to land in the gap shown in image
  const yText = useTransform(scrollYProgress, [0, 1], ["0vh", "75vh"]);
  const titleScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.75]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // Transforms for 2-line to 1-line morph
  const xLeft = useTransform(scrollYProgress, [0, 0.6], ["0%", "-55%"]);
  const xRight = useTransform(scrollYProgress, [0, 0.6], ["0%", "55%"]);
  const yUp = useTransform(scrollYProgress, [0, 0.6], ["0%", "-100%"]);

  const scrollToServices = () => {
    servicesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const navButtonClass = "text-gray-900 hover:bg-gray-900 hover:text-white font-bold font-mono uppercase tracking-widest transition-all duration-300 rounded-none";

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-orange-500/30 font-sans">
      {/* Header */}
      <header className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex-1"></div> {/* Spacer since logo is removed */}

          <nav className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <Link to="/admin">
                    <Button variant="ghost" className="text-gray-900 hover:bg-gray-900 hover:text-white font-bold font-mono uppercase tracking-widest transition-all duration-300 rounded-none">
                      <Settings className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400">
                    Hi, {user?.fullName?.split(' ')[0]}
                  </span>
                  <Button
                    onClick={signOut}
                    variant="ghost"
                    className="text-gray-900 hover:bg-gray-900 hover:text-white font-bold font-mono uppercase tracking-widest transition-all duration-300 rounded-none hover:bg-red-600 hover:text-white"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4 w-full justify-end">
                <Link to="/signin">
                  <Button variant="ghost" className="text-sm px-4 h-10 text-gray-900 hover:bg-gray-900 hover:text-white font-bold font-mono uppercase tracking-widest transition-all duration-300 rounded-none">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="outline" className="text-sm px-4 h-10 border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold font-mono uppercase tracking-widest transition-all duration-300 rounded-none">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      {/* Hero Section */}
      <section ref={targetRef} className="relative min-h-screen flex flex-col overflow-hidden pt-24 pb-6 md:justify-center md:pb-0">
        {/* Background Grid */}
        <motion.div style={{ y: yBg }} className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:30px_30px] md:bg-[size:40px_40px]"></div>
          <div className="absolute inset-0 bg-white/40 radial-gradient-center"></div>
        </motion.div>

        <motion.div style={{ y: yText }} className="container mx-auto px-4 relative z-10 text-center flex-1 flex flex-col items-center justify-center w-full">
          <motion.div style={{ opacity: contentOpacity }} className="mb-8 md:mb-8">
            <div className="inline-block px-3 py-1 md:px-4 md:py-1.5 border border-[#FF5722]/30 rounded-full bg-[#FF5722]/5 backdrop-blur-sm">
              <span className="text-[#FF5722] font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold">Next Gen Manufacturing</span>
            </div>
          </motion.div>

          <motion.h1 style={{ scale: titleScale }} className="text-5xl md:text-7xl lg:text-9xl font-bold font-mono tracking-tighter mb-8 text-gray-900 origin-center flex flex-col items-center justify-center leading-[0.9] md:leading-[0.85] w-full">
            <div className="md:hidden flex flex-col leading-none gap-2">
              <span>MATERIALIZE</span>
              <span>YOUR</span>
              <span>IDEAS</span>
            </div>

            <div className="hidden md:block">
              <motion.span style={{ x: xLeft }} className="whitespace-nowrap z-10 block">MATERIALIZE</motion.span>
              <motion.span style={{ x: xRight, y: yUp }} className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-[#FF5722] to-gray-900 animate-gradient-x whitespace-nowrap z-0 block">YOUR IDEAS</motion.span>
            </div>
          </motion.h1>

          <motion.div style={{ opacity: contentOpacity }} className="w-full">
            <p className="text-gray-500 text-lg md:text-xl max-w-lg md:max-w-2xl mx-auto mb-12 font-light leading-relaxed px-4">
              Professional 3D printing services with instant quotes, multiple materials, and lightning-fast turnaround times.
            </p>
          </motion.div>
        </motion.div>

        {/* Mobile-Specific Bottom Controls */}
        <div className="container mx-auto px-4 relative z-20 md:hidden mt-auto">
          {!isAuthenticated && (
            <div className="flex gap-3 mb-4 w-full">
              <Link to="/signin" className="flex-1">
                <Button variant="ghost" className="w-full border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold font-mono uppercase tracking-widest rounded-none h-12">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" className="flex-1">
                <Button variant="outline" className="w-full bg-gray-900 text-white border-2 border-gray-900 hover:bg-gray-800 font-bold font-mono uppercase tracking-widest rounded-none h-12">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
          <Button
            onClick={scrollToServices}
            className="w-full h-16 bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold font-mono text-lg uppercase tracking-widest rounded-none shadow-xl transition-all duration-300 transform active:scale-95"
          >
            Get Started <Zap className="ml-2 w-5 h-5 fill-current" />
          </Button>
        </div>

        {/* Desktop Controls (Hidden Mobile) */}
        <motion.div style={{ opacity: contentOpacity }} className="hidden md:flex flex-col md:flex-row items-center justify-center gap-6 w-full px-4 mb-20">
          <Button
            onClick={scrollToServices}
            className="w-full md:w-auto h-16 px-10 bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold font-mono text-lg uppercase tracking-widest rounded-none shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            Get Started <Zap className="ml-2 w-5 h-5 fill-current" />
          </Button>
        </motion.div>

      </section>

      {/* Services Section */}
      <section ref={servicesRef} className="relative z-20 py-12 flex items-center min-h-[90vh] md:min-h-[50vh]">
        <div className="container mx-auto px-4 w-full">
          <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-8 md:pb-0 scrollbar-hide md:scrollbar-default -mx-4 px-4 md:mx-0 md:px-0">
            {/* 3D Printing Card */}
            <Link to="/quote" className="block group h-[65vh] md:h-full min-w-[85vw] md:min-w-0 flex-shrink-0 snap-center">
              <div className="bg-white border border-gray-200 p-8 hover:border-[#FF5722] transition-all duration-300 h-full rounded-none hover:shadow-lg cursor-pointer flex flex-col relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-orange-50 text-[#FF5722] text-[10px] font-bold px-2 py-1 rounded-none uppercase tracking-wider border border-orange-100/50">
                  Available Now
                </div>
                <h3 className="text-2xl font-bold font-mono uppercase tracking-tighter mb-4 text-gray-900 mt-4">3D Printing</h3>
                <p className="text-gray-500 mb-8 leading-relaxed flex-grow">
                  Upload your STL files and get instant prices. High quality FDM and SLA printing options available.
                </p>
                <div className="inline-flex items-center text-[#FF5722] font-bold font-mono uppercase tracking-widest hover:text-[#D84315] transition-colors group-hover:translate-x-2 duration-300 mt-auto">
                  Get Quote <span className="ml-2">&rarr;</span>
                </div>
              </div>
            </Link>

            {/* Custom Mfg Card */}
            <div className="h-[65vh] md:h-full min-w-[85vw] md:min-w-0 flex-shrink-0 snap-center">
              <div className="bg-white border border-gray-200 p-8 transition-all duration-300 relative overflow-hidden opacity-50 shadow-sm rounded-none flex items-center justify-center h-full">
                <span className="text-gray-400 font-bold font-mono uppercase tracking-widest text-xl">Coming Soon</span>
              </div>
            </div>

            {/* Prototyping Card */}
            <div className="h-[65vh] md:h-full min-w-[85vw] md:min-w-0 flex-shrink-0 snap-center">
              <div className="bg-white border border-gray-200 p-8 transition-all duration-300 relative overflow-hidden opacity-50 shadow-sm rounded-none flex items-center justify-center h-full">
                <span className="text-gray-400 font-bold font-mono uppercase tracking-widest text-xl">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 bg-white border-t border-gray-200 text-center text-gray-400 text-sm font-mono uppercase tracking-widest">
        &copy; {new Date().getFullYear()} ProtoFast. All rights reserved.
      </footer>
    </div>
  );
}
