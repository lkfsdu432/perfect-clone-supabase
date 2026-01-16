import { Settings, Wrench, Clock } from 'lucide-react';

interface MaintenancePageProps {
  message?: string;
}

const MaintenancePage = ({ message }: MaintenancePageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Animated Icon */}
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg">
            <Wrench className="w-10 h-10 text-primary-foreground animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          الموقع تحت الصيانة
        </h1>

        {/* Message */}
        <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
          {message || 'نقوم حالياً بتحديث الموقع لتقديم خدمة أفضل. سنعود قريباً!'}
        </p>

        {/* Status Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-center gap-3 text-warning mb-4">
            <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="font-medium">جاري العمل...</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            شكراً لصبركم 💙
          </p>
        </div>

        {/* Logo */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Settings className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">
            <span className="text-primary">BOOM</span>
            <span className="text-foreground">PAY</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
