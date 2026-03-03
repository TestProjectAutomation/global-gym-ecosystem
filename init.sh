#!/bin/bash
echo "🌍 بدء تشغيل نظام إدارة الصالات الرياضية العالمي..."
echo "================================================"

# التحقق من Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker غير مثبت. يرجى تثبيت Docker أولاً"
    exit 1
fi

# التحقق من Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose غير مثبت. يرجى تثبيت Docker Compose أولاً"
    exit 1
fi

# إعداد البيئة
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ تم إنشاء ملف .env"
fi

# تشغيل الخدمات
echo "🐳 تشغيل خدمات Docker..."
docker-compose up -d

echo "⏳ انتظار قاعدة البيانات..."
sleep 10

echo "✅ النظام قيد التشغيل!"
echo "📊 لوحة التحكم: http://localhost"
echo "🔑 admin@gym.com / Admin@123"
