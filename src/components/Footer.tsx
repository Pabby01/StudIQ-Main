import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Mission */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Image
                src="/logo.svg"
                alt="StudIQ"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-gray-600 text-sm max-w-md">
              Empowering students through AI and DeFi financial literacy. 
              Learn, save, and earn while building your financial future.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/ai-tutor" className="text-gray-600 hover:text-blue-600 text-sm">
                  AI Tutor
                </Link>
              </li>
              <li>
                <Link href="/pools" className="text-gray-600 hover:text-blue-600 text-sm">
                  Savings Pools
                </Link>
              </li>
              <li>
                <Link href="/stores" className="text-gray-600 hover:text-blue-600 text-sm">
                  Campus Store
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Security
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-gray-500 text-sm">
            © 2024 StudIQ. All rights reserved. Built for students, by students.
          </p>
        </div>
      </div>
    </footer>
  );
}