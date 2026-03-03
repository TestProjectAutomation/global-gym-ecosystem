#!/bin/bash
if [ -z "$1" ]; then
    echo "❌ يرجى تحديد ملف النسخ الاحتياطي"
    exit 1
fi
cat $1 | docker exec -i gym-db psql -U gym_admin gym_ecosystem
echo "✅ تمت الاستعادة"
