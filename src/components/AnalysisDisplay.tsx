import { motion } from "motion/react";
import { Loader2, Download, CheckCircle2, AlertCircle, FileJson, Layers } from "lucide-react";
import { SchematicData, generateKiCadSchematic } from "@/src/services/gemini";

interface AnalysisDisplayProps {
  isAnalyzing: boolean;
  error: string | null;
  data: SchematicData | null;
}

export function AnalysisDisplay({ isAnalyzing, error, data }: AnalysisDisplayProps) {
  const handleDownload = () => {
    if (!data) return;
    const kicadContent = generateKiCadSchematic(data);
    const blob = new Blob([kicadContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schematic.kicad_sch";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isAnalyzing && !error && !data) return null;

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Analysis Results
          </h2>
        </div>

        <div className="p-8">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-white mb-2">Analyzing Schematic...</h3>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                  Gemini is identifying components, values, and connections. This may take a few seconds.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Analysis Failed</h3>
                <p className="text-sm text-zinc-500">{error}</p>
              </div>
            </div>
          )}

          {data && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Components Found</h4>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                      {data.components.length}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {data.components.map((comp) => (
                      <div key={comp.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-xs">
                        <span className="font-mono text-indigo-400">{comp.reference}</span>
                        <span className="text-zinc-400">{comp.type}</span>
                        <span className="text-zinc-500 italic">{comp.value || "N/A"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nets Identified</h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                      {data.nets.length}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {data.nets.map((net, i) => (
                      <div key={i} className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-xs">
                        <div className="font-mono text-emerald-400 mb-1">{net.name}</div>
                        <div className="text-[10px] text-zinc-500">
                          {net.nodes.length} connection points
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Schematic successfully processed
                </div>
                <button 
                  onClick={handleDownload}
                  className="w-full md:w-auto px-8 py-4 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 group"
                >
                  <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  Download KiCad Schematic (.kicad_sch)
                </button>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">
                  Format: KiCad v6+ S-Expression
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
