import { Construction, Wrench, Clock } from "lucide-react";

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="text-center max-w-lg">
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center animate-pulse">
            <Construction className="w-16 h-16 text-yellow-500" />
          </div>
          <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full flex items-center justify-center animate-bounce">
            <Wrench className="w-6 h-6 text-blue-400" />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          الموقع تحت الصيانة
        </h1>
        
        <p className="text-lg text-slate-300 mb-6">
          نعمل على تحسين الموقع لتقديم تجربة أفضل لكم.
          <br />
          سنعود قريباً إن شاء الله.
        </p>

        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Clock className="w-5 h-5" />
          <span>نعتذر عن أي إزعاج</span>
        </div>

        <div className="mt-12 flex justify-center gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
