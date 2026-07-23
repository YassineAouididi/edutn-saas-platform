import { Link } from 'react-router-dom';
import { GraduationCap, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export function Footer() {
  const sections = [
    {
      title: 'Platform',
      links: [
        { label: 'Home', to: '/' },
        { label: 'Subjects', to: '/subjects' },
        { label: 'Browse', to: '/search' },
        { label: 'Teachers', to: '/teachers' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Sign In', to: '/login' },
        { label: 'Register', to: '/register' },
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Teacher Portal', to: '/teacher' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Blog', to: '/blog' },
        { label: 'FAQ', to: '/faq' },
        { label: 'Contact', to: '/contact' },
        { label: 'About', to: '/about' },
      ],
    },
  ];

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold font-display">
                Edu<span className="gradient-text">TN</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Tunisia's premier educational platform for secondary school students and teachers.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> contact@edutn.tn
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> +216 71 000 000
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Tunis, Tunisia
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            (c) {new Date().getFullYear()} EduTN. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <a href="#" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
