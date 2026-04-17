import type { Metadata } from 'next';
import Link from 'next/link';
import { Target, Eye, Heart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Gioi thieu - WebTemplate',
  description:
    'Tim hieu ve WebTemplate — su menh, tam nhin va doi ngu cua chung toi.',
};

const teamMembers = [
  { name: 'Nguyen Van A', role: 'CEO & Founder', avatar: 'A' },
  { name: 'Tran Thi B', role: 'CTO', avatar: 'B' },
  { name: 'Le Van C', role: 'Head of Design', avatar: 'C' },
  { name: 'Pham Thi D', role: 'Marketing Lead', avatar: 'D' },
];

/**
 * Trang gioi thieu — company story, mission, team
 */
export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Ve chung toi
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            WebTemplate duoc thanh lap voi su menh mang den trai nghiem mua
            sam truc tuyen tot nhat cho nguoi Viet Nam.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-6">Cau chuyen cua chung toi</h2>
        <div className="prose prose-sm sm:prose max-w-none text-gray-600">
          <p>
            Bat dau tu nam 2020 voi chi 2 thanh vien, WebTemplate da phat trien
            thanh mot nen tang thuong mai dien tu hang dau. Chung toi tin rang
            moi nguoi deu xung dang co duoc san pham chat luong voi gia ca hop ly.
          </p>
          <p>
            Voi doi ngu hon 50 nhan vien tan tam, chung toi khong ngung cai tien
            de mang den trai nghiem mua sam tuyet voi nhat cho khach hang.
          </p>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <Card className="p-6 sm:p-8">
              <CardContent className="p-0">
                <Target className="h-10 w-10 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold mb-3">Su menh</h3>
                <p className="text-gray-600">
                  Mang den trai nghiem mua sam truc tuyen de dang, an toan va
                  gia tri nhat cho moi khach hang. Chung toi cam ket chat luong
                  san pham va dich vu khach hang xuat sac.
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 sm:p-8">
              <CardContent className="p-0">
                <Eye className="h-10 w-10 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold mb-3">Tam nhin</h3>
                <p className="text-gray-600">
                  Tro thanh nen tang thuong mai dien tu so 1 Viet Nam, noi moi
                  nguoi deu co the tim thay san pham phu hop voi nhu cau va
                  ngan sach cua minh.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Doi ngu cua chung toi
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <div key={member.name} className="text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-blue-600">
                    {member.avatar}
                  </span>
                </div>
                <h3 className="font-semibold text-sm sm:text-base">
                  {member.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-blue-600 text-white text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">San sang mua sam?</h2>
          <p className="text-blue-100 mb-6">
            Lien he voi chung toi hoac bat dau mua sam ngay hom nay.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50"
              asChild
            >
              <Link href="/products">Xem san pham</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              asChild
            >
              <Link href="/contact">Lien he</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
