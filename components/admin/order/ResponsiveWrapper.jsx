import { useEffect, useState } from 'react';

export default function ResponsiveWrapper({ children }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {children({ isMobile, isTablet })}
      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-hidden {
            display: none !important;
          }
          
          .mobile-full {
            width: 100% !important;
          }
          
          .mobile-stack {
            flex-direction: column !important;
            gap: 1rem !important;
          }

          /* Improve touch targets on mobile */
          button, a, input[type="button"], input[type="submit"] {
            min-height: 44px;
            min-width: 44px;
          }

          /* Better spacing for mobile forms */
          input, select, textarea {
            font-size: 16px; /* Prevents zoom on iOS */
          }
        }

        @media (max-width: 1024px) {
          .desktop-only {
            display: none !important;
          }
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Smooth transitions */
        * {
          transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        /* Disable transitions for animations that shouldn't be smooth */
        .no-transition {
          transition: none !important;
        }

        /* Loading animation */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Fade in animation */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }

        /* Slide up animation */
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        /* Focus styles for accessibility */
        button:focus,
        a:focus,
        input:focus,
        select:focus,
        textarea:focus {
          outline: 2px solid #3B82F6;
          outline-offset: 2px;
        }

        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1f2937;
            color: #f3f4f6;
          }
        }
      `}</style>
    </>
  );
}
