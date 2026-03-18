import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import GererStock from "./pages/GererStock";
import AdminOrders from "./pages/AdminOrders";
import AdminNotifications from "./pages/AdminNotifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* Admin routes */}
          <Route path="/DjAbEr/login" element={<AdminLogin />} />
          <Route path="/DjAbEr/gerer_stock" element={<GererStock />} />
          <Route path="/DjAbEr/orders" element={<AdminOrders />} />
          <Route path="/DjAbEr/notifications" element={<AdminNotifications />} />
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
