import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HomePage } from '@/pages/HomePage';
import { SubjectsPage, SubjectDetailPage } from '@/pages/SubjectsPage';
import { SearchPage } from '@/pages/SearchPage';
import { DocumentDetailPage } from '@/pages/DocumentDetailPage';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { TeacherDashboard } from '@/pages/TeacherDashboard';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { TeachersPage } from '@/pages/TeachersPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/subjects/:slug" element={<SubjectDetailPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/documents/:id" element={<DocumentDetailPage />} />
                <Route path="/teachers" element={<TeachersPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/dashboard/*" element={<StudentDashboard />} />
                <Route path="/teacher/*" element={<TeacherDashboard />} />
                <Route path="/admin/*" element={<AdminDashboard />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
