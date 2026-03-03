#!/bin/bash
echo "📦 بدء النسخ الاحتياطي..."
docker exec gym-db pg_dump -U gym_admin gym_ecosystem > backup_$(date +%Y%m%d).sql
echo "✅ تم النسخ الاحتياطي"
