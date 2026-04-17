'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Phone, Mail, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { contactSchema, type ContactFormData } from '@/lib/validations';
import { contactsApi } from '@/lib/api/modules/contacts.api';

const contactInfo = [
  { icon: MapPin, label: 'Dia chi', value: '123 Nguyen Hue, Q1, TP.HCM' },
  { icon: Phone, label: 'Dien thoai', value: '0900 123 456' },
  { icon: Mail, label: 'Email', value: 'info@webtemplate.vn' },
  { icon: Clock, label: 'Gio lam viec', value: 'T2 - T7: 8:00 - 18:00' },
];

/**
 * Trang lien he — form + info + map placeholder
 */
export function ContactClient() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setError('');
    try {
      await contactsApi.submit(data);
      setSubmitted(true);
      reset();
    } catch (err: any) {
      setError(err.message || 'Co loi xay ra, vui long thu lai');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Lien he</h1>
      <p className="text-gray-500 mb-8">
        Ban co cau hoi? Hay gui tin nhan cho chung toi.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          {submitted ? (
            <Card className="p-8 text-center">
              <CardContent className="p-0">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">
                  Gui thanh cong!
                </h2>
                <p className="text-gray-500 mb-4">
                  Cam on ban da lien he. Chung toi se phan hoi trong vong 24h.
                </p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Gui tin nhan khac
                </Button>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ho ten *
                  </label>
                  <Input {...register('name')} placeholder="Nhap ho ten" />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input {...register('email')} placeholder="Nhap email" type="email" />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    So dien thoai
                  </label>
                  <Input {...register('phone')} placeholder="0900 123 456" />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chu de *
                  </label>
                  <Input {...register('subject')} placeholder="Nhap chu de" />
                  {errors.subject && (
                    <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Noi dung *
                </label>
                <Textarea
                  {...register('message')}
                  placeholder="Nhap noi dung tin nhan..."
                  rows={5}
                />
                {errors.message && (
                  <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? 'Dang gui...' : 'Gui tin nhan'}
              </Button>
            </form>
          )}
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          {contactInfo.map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4 flex items-start gap-3">
                <item.icon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-sm text-gray-600">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Map placeholder */}
          <div className="aspect-square rounded-xl bg-gray-200 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Ban do</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
