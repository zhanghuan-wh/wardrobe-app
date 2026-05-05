-- ==========================================
-- 衣橱整理助手 - Supabase 数据库初始化脚本
-- 在 Supabase 控制台 → SQL Editor 中运行
-- ==========================================

-- 1. 创建箱子表
CREATE TABLE IF NOT EXISTS boxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT NOT NULL DEFAULT '四季',
  location TEXT,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建衣服表
CREATE TABLE IF NOT EXISTS clothes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id UUID REFERENCES boxes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  color TEXT,
  tags TEXT[] DEFAULT '{}',
  photo_url TEXT,
  ai_labels TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'stored' CHECK (status IN ('stored', 'taken_out')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 创建索引（加速搜索）
CREATE INDEX IF NOT EXISTS idx_clothes_box_id ON clothes(box_id);
CREATE INDEX IF NOT EXISTS idx_clothes_status ON clothes(status);
CREATE INDEX IF NOT EXISTS idx_clothes_category ON clothes(category);
CREATE INDEX IF NOT EXISTS idx_boxes_season ON boxes(season);

-- 4. 启用行级安全（RLS）
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothes ENABLE ROW LEVEL SECURITY;

-- 5. 创建访问策略（允许匿名读写 - 个人使用场景）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_boxes') THEN
    CREATE POLICY "allow_all_boxes" ON boxes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_clothes') THEN
    CREATE POLICY "allow_all_clothes" ON clothes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. 创建存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe-photos', 'wardrobe-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 7. 存储策略
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_upload_photos') THEN
    CREATE POLICY "allow_upload_photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'wardrobe-photos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_read_photos') THEN
    CREATE POLICY "allow_read_photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'wardrobe-photos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_delete_photos') THEN
    CREATE POLICY "allow_delete_photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'wardrobe-photos');
  END IF;
END $$;

-- 完成！
SELECT '数据库初始化完成 ✅' AS result;
