import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

const VisitCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase.from("visits").select("*", { count: "exact", head: true })
      .then(({ count }) => setCount(count || 0));
  }, []);

  return (
    <div className="bg-info/10 p-4 rounded-xl text-center">
      <Users className="w-6 h-6 text-info mx-auto mb-2" />
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm text-muted-foreground">إجمالي الزيارات</p>
    </div>
  );
};

export default VisitCounter;
