import { useState } from "react";
import { Header } from "./components/Header";
import { CaptureSection } from "./components/CaptureSection";
import { AnalysisDisplay } from "./components/AnalysisDisplay";
import { analyzeSchematic, SchematicData } from "./services/gemini";
import { motion } from "motion/react";
import { Cpu, Zap, Download, FileCode } from "lucide-react";

export default function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schematicData, setSchematicData] = useState<SchematicData | null>(null);

  const handleCapture = async (image: string) => {
    setIsAnalyzing(true);
    setError(null);
    setSchematicData(null);
    
    try {
      const data = await analyzeSchematic(image);
      setSchematicData(data);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
      <Header />
      
      <main className="pb-20">
        <section className="relative py-20 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.15),transparent_50%)]" />
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6"
              >
                <Zap className="w-3 h-3" />
                Next-Gen EDA Tool
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6"
              >
                From Image to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">KiCad Schematic</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-zinc-400 max-w-2xl mx-auto"
              >
                Use AI to automatically extract components and connections from hand-drawn or printed schematic images. Export directly to <a target="_blank" href="https://dev-docs.kicad.org/en/file-formats/sexpr-schematic/index.html">.kicad_sch format</a>.
              </motion.p>
            </div>

            <CaptureSection onCapture={handleCapture} />
            
            <AnalysisDisplay 
              isAnalyzing={isAnalyzing} 
              error={error} 
              data={schematicData} 
            />
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-4 py-20 border-t border-zinc-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-900 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <Cpu className="w-6 h-6 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Vision AI Analysis</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Powered by Gemini 2.0 Flash, our engine recognizes resistors, capacitors, ICs, and complex wiring patterns with high precision.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-900 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <FileCode className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">KiCad S-Expr Export</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Generates industry-standard .kicad_sch files compatible with KiCad v6, v7, and v8. Ready for PCB layout.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-900 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6">
                <Download className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Multi-Source Input</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Capture from your webcam, upload a high-res photo, or take a screenshot of a schematic from a PDF or website.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
