import Link from 'next/link';

/**
 * Footer chinh — links, info, copyright
 */
export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">WebTemplate</h3>
            <p className="text-sm leading-relaxed">
              Cung cap san pham chat luong cao voi gia tot nhat. Mua sam truc tuyen de dang, nhanh chong va an toan.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Lien ket</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="hover:text-white transition-colors">San pham</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">Gioi thieu</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Ho tro</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-white transition-colors">Lien he</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">Cau hoi thuong gap</Link></li>
              <li><Link href="/chinh-sach-doi-tra" className="hover:text-white transition-colors">Chinh sach doi tra</Link></li>
              <li><Link href="/dieu-khoan" className="hover:text-white transition-colors">Dieu khoan su dung</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Lien he</h4>
            <ul className="space-y-2 text-sm">
              <li>123 Nguyen Hue, Q1, TP.HCM</li>
              <li>0900 123 456</li>
              <li>info@webtemplate.vn</li>
              <li>T2 - T7: 8:00 - 18:00</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} WebTemplate. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
