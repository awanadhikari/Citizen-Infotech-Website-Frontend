
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminDepartment from "./pages/admin/AdminDepartment";
import Index from "./pages/Index";
import About from "./pages/About";
import Work from "./pages/Work";
import ProjectDetail from "./pages/ProjectDetail";
import Inside from "./pages/Inside";
import Team from "./pages/Team";
import Careers from "./pages/Careers";
import Contact from "./pages/Contact";
import AdminLayout from "./components/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminPages from "./pages/admin/AdminPages";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminHome from "./pages/admin/AdminHome";
import AdminWorks from "./pages/admin/AdminWorks";
import AdminServices from "./pages/admin/AdminServices";
import AdminInside from "./pages/admin/AdminInside";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrolltoTop";
import AdminProjectDetails from "./pages/admin/AdminProjectDetails";

const queryClient = new QueryClient();
// const AdminProjectDetails = lazy(() => import("./pages/admin/AdminProjectDetails"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/work" element={<Work />} />
              <Route path="/work/:projectSlug" element={<ProjectDetail />} />
              <Route path="/inside" element={<Inside />} />
              <Route path="/team" element={<Team />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="home" element={<AdminHome />} />
                <Route path="works" element={<AdminWorks />} />
                <Route
                  path="project-details"
                  element={
                    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
                      <AdminProjectDetails />
                    </Suspense>
                  }
                />
                <Route path="services" element={<AdminServices />} />
                <Route path="inside" element={<AdminInside />} />
                <Route path="team" element={<AdminTeam />} />
                <Route path="jobs" element={<AdminJobs />} />
                <Route path="applications" element={<AdminApplications />} />
                <Route path="pages" element={<AdminPages />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="departments" element={<AdminDepartment />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
