-- ============================================================
-- WebTemplate — Full Demo Seed v1
-- Chạy sau migration: mysql -u user -p db < seeds/demo-full.sql
-- Admin: admin@demo.local / Admin@2026
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ─── Admin Account ─────────────────────────────────────────
DELETE FROM `users` WHERE `email` = 'admin@demo.local';
INSERT INTO `users` (
  `id`, `email`, `password`, `first_name`, `last_name`,
  `role`, `is_active`, `is_email_verified`, `created_at`, `updated_at`
) VALUES (
  '01JTEMPLATE000000000000001',
  'admin@demo.local',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LfP9KGGNkPCiRFdWa',
  'Super',
  'Admin',
  'super_admin',
  1,
  1,
  NOW(),
  NOW()
);

-- ─── Site Settings ─────────────────────────────────────────
INSERT INTO `settings` (`id`, `key`, `value`, `group_name`, `created_at`, `updated_at`)
VALUES
  ('01JTEMPLATE000000000000010', 'site_name',        'WebTemplate Shop',                             'general', NOW(), NOW()),
  ('01JTEMPLATE000000000000011', 'site_email',       'admin@demo.local',                              'general', NOW(), NOW()),
  ('01JTEMPLATE000000000000012', 'maintenance_mode', 'false',                                         'general', NOW(), NOW()),
  ('01JTEMPLATE000000000000013', 'site_phone',       '028 3901 2345',                                 'general', NOW(), NOW()),
  ('01JTEMPLATE000000000000014', 'site_address',     '88 Lý Thường Kiệt, Phường 7, Quận Tân Bình, TP.HCM', 'general', NOW(), NOW()),
  ('01JTEMPLATE000000000000015', 'currency',         'VND',                                           'shop',    NOW(), NOW()),
  ('01JTEMPLATE000000000000016', 'currency_symbol',  '₫',                                             'shop',    NOW(), NOW())
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW();

-- ─── Categories (product type) ─────────────────────────────
DELETE FROM `categories` WHERE `type` = 'product';
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `image_url`, `parent_id`, `type`, `sort_order`, `is_active`, `metadata`, `created_at`, `updated_at`)
VALUES
('01JTEMPLATE0CAT000000001', 'Điện tử & Công nghệ', 'dien-tu-cong-nghe',
  'Smartphone, laptop, tablet, phụ kiện điện tử chính hãng',
  'https://picsum.photos/seed/electronics/400/300',
  NULL, 'product', 1, 1, NULL, NOW(), NOW()),

('01JTEMPLATE0CAT000000002', 'Thời trang nam', 'thoi-trang-nam',
  'Áo, quần, giày, phụ kiện thời trang dành cho nam',
  'https://picsum.photos/seed/men-fashion/400/300',
  NULL, 'product', 2, 1, NULL, NOW(), NOW()),

('01JTEMPLATE0CAT000000003', 'Thời trang nữ', 'thoi-trang-nu',
  'Váy, đầm, áo, túi xách, giày dép và phụ kiện nữ',
  'https://picsum.photos/seed/women-fashion/400/300',
  NULL, 'product', 3, 1, NULL, NOW(), NOW()),

('01JTEMPLATE0CAT000000004', 'Gia dụng & Nội thất', 'gia-dung-noi-that',
  'Đồ gia dụng, thiết bị nhà bếp, đồ nội thất thông minh',
  'https://picsum.photos/seed/homeware/400/300',
  NULL, 'product', 4, 1, NULL, NOW(), NOW()),

('01JTEMPLATE0CAT000000005', 'Sách & Văn phòng phẩm', 'sach-van-phong-pham',
  'Sách tiếng Việt và ngoại ngữ, văn phòng phẩm, dụng cụ học tập',
  'https://picsum.photos/seed/books/400/300',
  NULL, 'product', 5, 1, NULL, NOW(), NOW());

-- ─── Categories (article type) ────────────────────────────
DELETE FROM `categories` WHERE `type` = 'article';
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `image_url`, `parent_id`, `type`, `sort_order`, `is_active`, `metadata`, `created_at`, `updated_at`)
VALUES
('01JTEMPLATE0CAT000000010', 'Tin tức',       'tin-tuc',       'Tin tức mới nhất về công nghệ và xu hướng',  NULL, NULL, 'article', 1, 1, NULL, NOW(), NOW()),
('01JTEMPLATE0CAT000000011', 'Hướng dẫn',     'huong-dan',     'Hướng dẫn sử dụng và mẹo vặt hữu ích',      NULL, NULL, 'article', 2, 1, NULL, NOW(), NOW()),
('01JTEMPLATE0CAT000000012', 'Khuyến mãi',    'khuyen-mai',    'Chương trình khuyến mãi, deal hot tháng',   NULL, NULL, 'article', 3, 1, NULL, NOW(), NOW());

-- ─── Products (20 sản phẩm) ───────────────────────────────
DELETE FROM `products` WHERE `id` LIKE '01JTEMPLATE0PRD%';
INSERT INTO `products` (
  `id`, `name`, `slug`, `description`, `short_description`, `sku`,
  `price`, `compare_at_price`, `cost_price`, `category_id`,
  `brand`, `images`, `is_active`, `is_featured`,
  `weight`, `tags`, `view_count`, `sort_order`, `tenant_id`,
  `created_at`, `updated_at`
) VALUES

-- Điện tử (4 sản phẩm)
(
  '01JTEMPLATE0PRD000000001',
  'iPhone 15 Pro Max 256GB Titan Đen',
  'iphone-15-pro-max-256gb-titan-den',
  'iPhone 15 Pro Max với chip A17 Pro mạnh mẽ, camera 48MP Action button, titanium frame siêu nhẹ. Màn hình Super Retina XDR 6.7 inch, ProMotion 120Hz. Pin 29h. Kháng nước IP68.',
  'iPhone 15 Pro Max — chip A17 Pro, camera 48MP, khung titanium, màn 6.7 inch ProMotion 120Hz.',
  'SKU-APPL-IP15PM-256-BK',
  34990000, 36990000, NULL,
  '01JTEMPLATE0CAT000000001',
  'Apple',
  '[{"url":"https://picsum.photos/seed/iphone15/800/600","alt":"iPhone 15 Pro Max Titan Đen","sort_order":1},{"url":"https://picsum.photos/seed/iphone15b/800/600","alt":"iPhone 15 Pro Max mặt sau","sort_order":2}]',
  1, 1, 0.221,
  '["apple","iphone","smartphone","flagship"]',
  1240, 1, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000002',
  'MacBook Air M3 15 inch 8GB/256GB',
  'macbook-air-m3-15-inch-8gb-256gb',
  'MacBook Air M3 mỏng nhẹ nhất từ trước đến nay. Chip Apple M3 mạnh hơn 60% so với thế hệ trước. Pin lên đến 18 giờ. Màn hình Liquid Retina 15.3 inch siêu sắc nét. Không quạt, không ồn.',
  'MacBook Air M3 15" — chip M3, pin 18h, màn 15.3" Liquid Retina, không quạt im lặng tuyệt đối.',
  'SKU-APPL-MBA3-15-8256',
  32990000, 34990000, NULL,
  '01JTEMPLATE0CAT000000001',
  'Apple',
  '[{"url":"https://picsum.photos/seed/macbookair/800/600","alt":"MacBook Air M3","sort_order":1}]',
  1, 1, 1.51,
  '["apple","macbook","laptop","m3"]',
  876, 2, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000003',
  'Samsung Galaxy Tab S9 FE 128GB WiFi',
  'samsung-galaxy-tab-s9-fe-128gb-wifi',
  'Galaxy Tab S9 FE 10.9 inch, bộ vi xử lý Exynos 1380, màn hình LCD TFT. Bút S Pen đi kèm, pin 8000mAh, camera 8MP. Phù hợp học tập, làm việc và giải trí.',
  'Galaxy Tab S9 FE — 10.9 inch, S Pen, 8000mAh, Exynos 1380. Học tập và giải trí tuyệt vời.',
  'SKU-SMSG-TABS9FE-128',
  11990000, 13490000, NULL,
  '01JTEMPLATE0CAT000000001',
  'Samsung',
  '[{"url":"https://picsum.photos/seed/galaxytab/800/600","alt":"Samsung Galaxy Tab S9 FE","sort_order":1}]',
  1, 0, 0.523,
  '["samsung","tablet","s-pen","android"]',
  543, 3, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000004',
  'Tai nghe Sony WH-1000XM5 Chống ồn',
  'tai-nghe-sony-wh-1000xm5-chong-on',
  'Tai nghe over-ear Sony WH-1000XM5, công nghệ chống ồn chủ động tốt nhất thế giới. Pin 30h, sạc nhanh 10 phút nghe 3h. Codec LDAC Hi-Res Audio, kết nối Multipoint. Thiết kế gọn nhẹ hơn thế hệ trước.',
  'Sony WH-1000XM5 — ANC đỉnh nhất, pin 30h, Hi-Res LDAC, kết nối 2 thiết bị cùng lúc.',
  'SKU-SONY-WH1000XM5-BK',
  7990000, 8990000, NULL,
  '01JTEMPLATE0CAT000000001',
  'Sony',
  '[{"url":"https://picsum.photos/seed/sony-headphone/800/600","alt":"Sony WH-1000XM5","sort_order":1}]',
  1, 0, 0.25,
  '["sony","tai-nghe","anc","hi-res"]',
  789, 4, NULL, NOW(), NOW()
),

-- Thời trang nam (4 sản phẩm)
(
  '01JTEMPLATE0PRD000000005',
  'Áo polo nam pique basic — Xanh navy',
  'ao-polo-nam-pique-basic-xanh-navy',
  'Áo polo nam chất liệu pique cotton 65/35 cao cấp, thoáng mát, không xù. Cổ bẻ chắc chắn, đường may tỉ mỉ. 6 màu, size S-3XL. Phù hợp đi làm, đi chơi casual.',
  'Áo polo pique cotton cao cấp, thoáng mát, 6 màu, size S-3XL. Đi làm và casual đều đẹp.',
  'SKU-POLO-M-NV-M',
  299000, 399000, NULL,
  '01JTEMPLATE0CAT000000002',
  'Routine',
  '[{"url":"https://picsum.photos/seed/polo-navy/800/600","alt":"Áo polo nam xanh navy","sort_order":1}]',
  1, 0, 0.25,
  '["polo","nam","basic","cotton"]',
  423, 1, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000006',
  'Quần chino slim fit nam — Kaki kem',
  'quan-chino-slim-fit-nam-kaki-kem',
  'Quần chino dáng slim fit, chất kaki cao cấp dày dặn không nhăn. Phù hợp mặc đi làm văn phòng, đi dạo. Cạp quần có khóa kéo ẩn tinh tế. Size 28-34.',
  'Quần chino slim fit kaki cao cấp, không nhăn, phù hợp đi làm. Size 28-34.',
  'SKU-CHIN-M-KK-32',
  459000, 599000, NULL,
  '01JTEMPLATE0CAT000000002',
  'Routine',
  '[{"url":"https://picsum.photos/seed/chino/800/600","alt":"Quần chino nam kaki kem","sort_order":1}]',
  1, 0, 0.45,
  '["chino","quần","slim-fit","văn-phòng"]',
  315, 2, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000007',
  'Giày sneaker nam đế thô phối màu',
  'giay-sneaker-nam-de-tho-phoi-mau',
  'Sneaker nam streetwear đế chunky cao 4cm, chất liệu da PU cao cấp kết hợp vải lưới thoáng khí. Đế ngoài cao su chống trượt. Phối màu trắng đen retro hiện đại. Size 38-44.',
  'Sneaker đế chunky nam, da PU + lưới thoáng khí, đế cao su chống trượt. Size 38-44.',
  'SKU-SNKR-M-WB-41',
  799000, 999000, NULL,
  '01JTEMPLATE0CAT000000002',
  'StreetX',
  '[{"url":"https://picsum.photos/seed/sneaker-men/800/600","alt":"Sneaker nam đế thô","sort_order":1}]',
  1, 1, 0.62,
  '["sneaker","giày","streetwear","chunky"]',
  687, 3, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000008',
  'Ví da nam gập đôi RFID blocking',
  'vi-da-nam-gap-doi-rfid-blocking',
  'Ví da bò thật gập đôi, công nghệ RFID blocking bảo vệ thẻ ngân hàng khỏi bị quét trộm. 8 khe thẻ, 2 ngăn tiền mặt, 1 ngăn bí mật. Kích thước 11x9cm gọn gàng. Hộp quà tặng cao cấp.',
  'Ví da bò thật, RFID blocking, 8 khe thẻ, hộp quà tặng. Bảo vệ thẻ ngân hàng khỏi bị quét.',
  'SKU-WLET-M-BRFID',
  349000, NULL, NULL,
  '01JTEMPLATE0CAT000000002',
  'LeatherCraft',
  '[{"url":"https://picsum.photos/seed/wallet-men/800/600","alt":"Ví da nam RFID","sort_order":1}]',
  1, 0, 0.08,
  '["ví","da","nam","rfid","quà-tặng"]',
  234, 4, NULL, NOW(), NOW()
),

-- Thời trang nữ (4 sản phẩm)
(
  '01JTEMPLATE0PRD000000009',
  'Đầm maxi hoa nhí vải voan mềm',
  'dam-maxi-hoa-nhi-vai-voan-mem',
  'Đầm dài maxi chất voan cao cấp họa tiết hoa nhỏ nhắn. Kiểu dáng thắt eo tôn dáng, cổ tròn nhẹ nhàng. Phù hợp đi biển, picnic, du lịch. Kéo sau dễ mặc. Size S-XL.',
  'Đầm maxi voan hoa nhí, thắt eo tôn dáng, đi biển và du lịch cực đẹp. Size S-XL.',
  'SKU-DRES-F-MXFLW-M',
  599000, 799000, NULL,
  '01JTEMPLATE0CAT000000003',
  'LaDame',
  '[{"url":"https://picsum.photos/seed/maxi-dress/800/600","alt":"Đầm maxi hoa nhí voan","sort_order":1}]',
  1, 1, 0.28,
  '["đầm","nữ","maxi","hoa-nhí","voan"]',
  892, 1, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000010',
  'Áo croptop cotton basic 5 màu',
  'ao-croptop-cotton-basic-5-mau',
  'Áo croptop cổ tròn chất cotton 100% mịn mướt, co giãn nhẹ. Dáng boxy vừa vặn, độ dài vừa eo, phù hợp mix với quần jeans, chân váy. Wash an toàn máy giặt. Size S-XL.',
  'Croptop cotton 100% mịn mướt, 5 màu cơ bản, mix đồ dễ dàng. Size S-XL.',
  'SKU-CROP-F-CT-S',
  199000, 249000, NULL,
  '01JTEMPLATE0CAT000000003',
  'LaDame',
  '[{"url":"https://picsum.photos/seed/croptop/800/600","alt":"Áo croptop cotton 5 màu","sort_order":1}]',
  1, 0, 0.18,
  '["croptop","nữ","cotton","basic"]',
  567, 2, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000011',
  'Túi tote canvas in chữ minimalist',
  'tui-tote-canvas-in-chu-minimalist',
  'Túi tote canvas nặng 420g/m² bền chắc, in chữ nghệ thuật minimalist. Quai tote dài vừa tay, khóa kéo bên trong. Đựng vừa laptop 13 inch, sách vở. Nhiều thiết kế độc đáo.',
  'Tote canvas nặng 420g/m², khoá trong, vừa laptop 13", in chữ nghệ thuật minimalist.',
  'SKU-TOTE-F-CNV-BK',
  299000, NULL, NULL,
  '01JTEMPLATE0CAT000000003',
  'CanvasArt',
  '[{"url":"https://picsum.photos/seed/tote-bag/800/600","alt":"Túi tote canvas minimalist","sort_order":1}]',
  1, 0, 0.35,
  '["túi","tote","canvas","minimalist"]',
  445, 3, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000012',
  'Giày sandal nữ quai ngang đế thấp',
  'giay-sandal-nu-quai-ngang-de-thap',
  'Sandal nữ đế thấp 3cm, quai ngang điều chỉnh được, chất liệu da PU mềm mịn. Đế EVA siêu nhẹ và êm ái. Phù hợp đi làm, đi chơi, mùa hè. Size 35-40.',
  'Sandal nữ đế 3cm, quai chỉnh được, da PU mềm, đế EVA êm ái. Size 35-40.',
  'SKU-SNDL-F-QUAI-37',
  459000, 599000, NULL,
  '01JTEMPLATE0CAT000000003',
  'StreetX',
  '[{"url":"https://picsum.photos/seed/sandal-women/800/600","alt":"Sandal nữ quai ngang","sort_order":1}]',
  1, 0, 0.38,
  '["sandal","nữ","đế-thấp","mùa-hè"]',
  312, 4, NULL, NOW(), NOW()
),

-- Gia dụng (4 sản phẩm)
(
  '01JTEMPLATE0PRD000000013',
  'Máy xay sinh tố đa năng Philips HR2221',
  'may-xay-sinh-to-da-nang-philips-hr2221',
  'Máy xay sinh tố Philips ProBlend 5 tốc độ xay + chế độ Pulse. Công suất 700W, bình thủy tinh 2L chịu nhiệt. Lưỡi dao 6 cánh inox không gỉ. Dễ tháo rời vệ sinh. Bảo hành 2 năm.',
  'Máy xay Philips 700W, 5 tốc độ, bình thủy tinh 2L, lưỡi 6 cánh inox. Bảo hành 2 năm.',
  'SKU-PHLP-HR2221-BLK',
  1290000, 1590000, NULL,
  '01JTEMPLATE0CAT000000004',
  'Philips',
  '[{"url":"https://picsum.photos/seed/blender/800/600","alt":"Máy xay sinh tố Philips","sort_order":1}]',
  1, 0, 1.8,
  '["máy-xay","philips","bếp","gia-dụng"]',
  356, 1, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000014',
  'Bộ nồi inox 3 đáy Fivestar 5 chiếc',
  'bo-noi-inox-3-day-fivestar-5-chiec',
  'Bộ 5 nồi inox 3 lớp đáy phẳng dùng được tất cả bếp (từ, gas, hồng ngoại). Nắp kính chịu nhiệt, tay cầm đổ nhiệt silicon an toàn. Kích thước đa dạng từ 16-24cm. Bảo hành 5 năm.',
  'Bộ 5 nồi inox 3 lớp đáy, dùng mọi loại bếp, tay cầm silicon, bảo hành 5 năm.',
  'SKU-FVST-NOINOX5-SET',
  899000, 1199000, NULL,
  '01JTEMPLATE0CAT000000004',
  'Fivestar',
  '[{"url":"https://picsum.photos/seed/pots-set/800/600","alt":"Bộ nồi inox Fivestar","sort_order":1}]',
  1, 0, 3.2,
  '["nồi","inox","bếp","gia-dụng","bộ"]',
  287, 2, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000015',
  'Đèn ngủ LED cảm biến chuyển động',
  'den-ngu-led-cam-bien-chuyen-dong',
  'Đèn ngủ LED cảm ứng tự động bật khi có chuyển động, tắt sau 30 giây. Sạc USB-C, pin 1200mAh dùng 3 tháng. Ánh sáng ấm 3000K dịu mắt. Dán tường hoặc cắm ổ điện linh hoạt.',
  'Đèn ngủ LED cảm biến chuyển động, sạc USB-C, pin 3 tháng, ánh sáng ấm 3000K.',
  'SKU-LAMP-LED-MOTION',
  249000, 299000, NULL,
  '01JTEMPLATE0CAT000000004',
  'Xiaomi',
  '[{"url":"https://picsum.photos/seed/night-light/800/600","alt":"Đèn ngủ LED cảm biến","sort_order":1}]',
  1, 0, 0.15,
  '["đèn-ngủ","led","cảm-biến","xiaomi"]',
  534, 3, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000016',
  'Giá sách gỗ thông treo tường 3 tầng',
  'gia-sach-go-thong-treo-tuong-3-tang',
  'Giá sách treo tường làm từ gỗ thông tự nhiên, phủ dầu bảo vệ. Khung thép tải trọng 15kg/tầng. Dễ lắp ráp, kèm bu lông và hướng dẫn. Kích thước 80x25x75cm (3 tầng). Phong cách Bắc Âu tối giản.',
  'Giá sách gỗ thông 3 tầng, tải 15kg/tầng, phong cách Bắc Âu tối giản, dễ lắp đặt.',
  'SKU-SHELF-PINE3T',
  849000, 1090000, NULL,
  '01JTEMPLATE0CAT000000004',
  'WoodHome',
  '[{"url":"https://picsum.photos/seed/bookshelf/800/600","alt":"Giá sách gỗ treo tường","sort_order":1}]',
  1, 1, 4.5,
  '["giá-sách","gỗ","nội-thất","bắc-âu"]',
  421, 4, NULL, NOW(), NOW()
),

-- Sách (4 sản phẩm)
(
  '01JTEMPLATE0PRD000000017',
  'Đắc Nhân Tâm — Dale Carnegie (bìa cứng)',
  'dac-nhan-tam-dale-carnegie-bia-cung',
  'Cuốn sách self-help bán chạy nhất mọi thời đại. Hơn 30 triệu bản bán ra toàn cầu. Bản dịch tiếng Việt chuẩn nhất của NXB Tổng hợp TP.HCM. Bìa cứng, giấy kem chất lượng cao, 320 trang.',
  'Đắc Nhân Tâm bản bìa cứng NXB Tổng hợp, 320 trang, giấy kem cao cấp. Bestseller toàn cầu.',
  'SKU-BOOK-DNT-HC',
  149000, 169000, NULL,
  '01JTEMPLATE0CAT000000005',
  'NXB Tổng hợp TP.HCM',
  '[{"url":"https://picsum.photos/seed/book-dnt/800/600","alt":"Đắc Nhân Tâm bìa cứng","sort_order":1}]',
  1, 1, 0.45,
  '["sách","self-help","dale-carnegie","bestseller"]',
  1102, 1, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000018',
  'Sapiens: Lược sử loài người — Yuval Harari',
  'sapiens-luoc-su-loai-nguoi-yuval-harari',
  'Tác phẩm lịch sử phi thường, kể câu chuyện về loài người từ buổi bình minh cho đến ngày nay. Đã được dịch ra 45 ngôn ngữ, bán 20 triệu bản. Bản tiếng Việt 596 trang của Alpha Books.',
  'Sapiens — lịch sử loài người 596 trang, Alpha Books, 45 ngôn ngữ, 20 triệu bản toàn cầu.',
  'SKU-BOOK-SAPIENS-VN',
  219000, 249000, NULL,
  '01JTEMPLATE0CAT000000005',
  'Alpha Books',
  '[{"url":"https://picsum.photos/seed/book-sapiens/800/600","alt":"Sapiens bìa mềm","sort_order":1}]',
  1, 0, 0.68,
  '["sách","lịch-sử","sapiens","harari"]',
  634, 2, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000019',
  'Bộ bút màu chuyên nghiệp 36 màu Staedtler',
  'bo-but-mau-chuyen-nghiep-36-mau-staedtler',
  'Bộ 36 bút màu Staedtler Noris Colour chuyên nghiệp, ngòi bút 3mm bền, màu sắc tươi sáng, không chảy màu. Phù hợp học sinh, sinh viên thiết kế, người đam mê vẽ. Hộp thiếc bảo quản tiện lợi.',
  'Bộ 36 bút màu Staedtler Noris, ngòi 3mm bền, màu tươi sáng, hộp thiếc. Chuyên nghiệp.',
  'SKU-STAE-NORIS-36',
  399000, 459000, NULL,
  '01JTEMPLATE0CAT000000005',
  'Staedtler',
  '[{"url":"https://picsum.photos/seed/pencils/800/600","alt":"Bút màu Staedtler 36 màu","sort_order":1}]',
  1, 0, 0.32,
  '["bút-màu","staedtler","văn-phòng","vẽ"]',
  289, 3, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0PRD000000020',
  'Sổ tay Moleskine Classic A5 bìa cứng đen',
  'so-tay-moleskine-classic-a5-bia-cung-den',
  'Sổ tay Moleskine Classic huyền thoại, dùng bởi Hemingway và Picasso. Bìa cứng, 240 trang giấy kem dày 70g/m², đường kẻ. Bookmark ribbon và túi bỏ giấy tờ ở bìa sau. Kích thước A5.',
  'Moleskine Classic A5 bìa cứng, 240 trang giấy kem 70g, có bookmark. Huyền thoại của giới sáng tạo.',
  'SKU-MOLE-CA5-HC-BK',
  349000, NULL, NULL,
  '01JTEMPLATE0CAT000000005',
  'Moleskine',
  '[{"url":"https://picsum.photos/seed/moleskine/800/600","alt":"Sổ Moleskine Classic A5","sort_order":1}]',
  1, 0, 0.22,
  '["sổ-tay","moleskine","văn-phòng","stationery"]',
  378, 4, NULL, NOW(), NOW()
);

-- ─── Articles (10 bài viết) ───────────────────────────────
DELETE FROM `articles` WHERE `id` LIKE '01JTEMPLATE0ART%';
INSERT INTO `articles` (
  `id`, `title`, `slug`, `content`, `excerpt`, `featured_image`,
  `category_id`, `author_id`, `status`, `tags`, `is_featured`,
  `published_at`, `view_count`, `tenant_id`, `created_at`, `updated_at`
) VALUES
(
  '01JTEMPLATE0ART000000001',
  'iPhone 15 Pro Max vs Samsung Galaxy S24 Ultra: Đâu là flagship đáng mua nhất 2024?',
  'iphone-15-pro-max-vs-galaxy-s24-ultra-danh-gia-2024',
  '<h2>Tổng quan</h2><p>Năm 2024 là cuộc chiến đỉnh cao giữa Apple và Samsung trong phân khúc flagship. Chúng ta hãy so sánh chi tiết hai chiếc điện thoại hàng đầu này.</p><h3>Hiệu năng</h3><p>A17 Pro của Apple vẫn dẫn đầu điểm benchmark đơn nhân, trong khi Snapdragon 8 Gen 3 của Samsung vượt trội về đa nhân và xử lý AI.</p><h3>Camera</h3><p>Galaxy S24 Ultra với zoom 200x quang học thực sự ấn tượng. iPhone 15 Pro Max với Action button và ProRAW linh hoạt hơn cho nhiếp ảnh chuyên nghiệp.</p><h3>Kết luận</h3><p>Nếu bạn cần zoom xa và bút S Pen, chọn Galaxy S24 Ultra. Nếu bạn cần hiệu năng đơn nhân tốt nhất và hệ sinh thái Apple, chọn iPhone 15 Pro Max.</p>',
  'So sánh chi tiết iPhone 15 Pro Max và Galaxy S24 Ultra — hiệu năng, camera, pin và giá cả. Đâu là lựa chọn đúng cho bạn?',
  'https://picsum.photos/seed/comparison/1200/630',
  '01JTEMPLATE0CAT000000010',
  '01JTEMPLATE000000000000001',
  'published',
  '["iphone","samsung","so-sánh","flagship","2024"]',
  1,
  DATE_SUB(NOW(), INTERVAL 5 DAY),
  3421, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0ART000000002',
  '5 cách phối đồ với áo polo nam không bao giờ lỗi mốt',
  '5-cach-phoi-do-voi-ao-polo-nam-khong-bao-gio-loi-mot',
  '<h2>Áo polo — item không bao giờ lỗi thời</h2><p>Từ sân golf đến văn phòng, từ casual đến smart casual, áo polo luôn là lựa chọn đáng tin cậy của mọi người đàn ông.</p><h3>1. Polo + Quần chino</h3><p>Combo kinh điển nhất. Chọn polo màu đơn kết hợp chino kaki hoặc beige, thêm giày loafer.</p><h3>2. Polo + Jeans xanh đậm</h3><p>Phong cách casual hoàn hảo. Tránh jeans đã rách hoặc màu nhạt.</p><h3>3. Polo trắng + Shorts bermuda</h3><p>Cho mùa hè hoặc đi biển, tạo vẻ fresh và clean.</p>',
  '5 gợi ý phối đồ với áo polo nam cực đẹp từ smart casual đến streetwear — áp dụng được mọi dịp.',
  'https://picsum.photos/seed/polo-style/1200/630',
  '01JTEMPLATE0CAT000000011',
  '01JTEMPLATE000000000000001',
  'published',
  '["thời-trang","polo","nam","phối-đồ"]',
  0,
  DATE_SUB(NOW(), INTERVAL 10 DAY),
  1245, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0ART000000003',
  'Review chi tiết MacBook Air M3: Có đáng nâng cấp từ M1/M2?',
  'review-macbook-air-m3-co-dang-nang-cap-tu-m1-m2',
  '<h2>MacBook Air M3 — Có thực sự vượt trội?</h2><p>Sau 2 tháng sử dụng thực tế MacBook Air M3, đây là những gì mình rút ra được.</p><h3>Hiệu năng</h3><p>M3 cải thiện ~15% đơn nhân và ~20% GPU so với M2. Với người dùng M1, mức tăng đáng kể hơn ~40%.</p><h3>Pin</h3><p>Vẫn là 18 giờ theo lý thuyết. Thực tế sử dụng hỗn hợp mình đạt khoảng 12-14 giờ.</p><h3>Màn hình</h3><p>Liquid Retina 15.3 inch sắc nét, nhưng không có ProMotion 120Hz như MacBook Pro. Đây là điểm trừ duy nhất.</p><h3>Kết luận</h3><p>M1 → M3: Đáng upgrade. M2 → M3: Không cần vội.</p>',
  'Review thực tế MacBook Air M3 sau 2 tháng sử dụng — hiệu năng, pin, màn hình và so sánh với M1/M2.',
  'https://picsum.photos/seed/macbook-review/1200/630',
  '01JTEMPLATE0CAT000000010',
  '01JTEMPLATE000000000000001',
  'published',
  '["macbook","apple","m3","review","laptop"]',
  1,
  DATE_SUB(NOW(), INTERVAL 3 DAY),
  2876, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0ART000000004',
  'Sale 6/6: Top 10 deal điện tử không thể bỏ qua',
  'sale-6-6-top-10-deal-dien-tu-khong-the-bo-qua',
  '<h2>Deal nóng tháng 6</h2><p>Mùa sale 6/6 đã đến! Dưới đây là danh sách 10 sản phẩm điện tử giảm giá sâu nhất, mình đã research kỹ và đây là những deal thực sự đáng mua.</p><h3>Deal #1: iPhone 15 giảm 3 triệu</h3><p>Hiếm khi iPhone giảm mạnh thế này. Cơ hội không thể bỏ qua.</p><h3>Deal #2: Tai nghe Sony WH-1000XM5 giảm 20%</h3><p>Tai nghe chống ồn tốt nhất giảm từ 8.99 triệu xuống 7.19 triệu.</p>',
  'Danh sách deal điện tử hot nhất sale 6/6 — iPhone, MacBook, tai nghe và phụ kiện giảm giá sâu.',
  'https://picsum.photos/seed/sale66/1200/630',
  '01JTEMPLATE0CAT000000012',
  '01JTEMPLATE000000000000001',
  'published',
  '["sale","khuyến-mãi","6/6","điện-tử"]',
  1,
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  4512, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0ART000000005',
  'Hướng dẫn chọn mua laptop cho sinh viên ngân sách 15 triệu',
  'huong-dan-chon-mua-laptop-sinh-vien-ngan-sach-15-trieu',
  '<h2>Laptop sinh viên ngân sách 15 triệu: Nên chọn gì?</h2><p>Với ngân sách 15 triệu, bạn có khá nhiều lựa chọn tốt. Đây là những tiêu chí quan trọng nhất.</p><h3>CPU</h3><p>Intel Core i5 Gen 12+ hoặc AMD Ryzen 5 6000 series là đủ cho đa số tác vụ học tập.</p><h3>RAM và SSD</h3><p>Tối thiểu 8GB RAM (16GB tốt hơn) và 512GB SSD. Tránh HDD hoặc eMMC.</p><h3>Gợi ý cụ thể</h3><ul><li>Acer Aspire 5 i5-1235U: 13.9 triệu</li><li>Lenovo IdeaPad Slim 3: 12.9 triệu</li><li>ASUS VivoBook 15: 14.5 triệu</li></ul>',
  'Hướng dẫn chọn laptop sinh viên ngân sách 15 triệu — tiêu chí, gợi ý model và mẹo mua hàng thông minh.',
  'https://picsum.photos/seed/laptop-guide/1200/630',
  '01JTEMPLATE0CAT000000011',
  '01JTEMPLATE000000000000001',
  'published',
  '["laptop","sinh-viên","hướng-dẫn","mua-hàng"]',
  0,
  DATE_SUB(NOW(), INTERVAL 15 DAY),
  2134, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0ART000000006',
  'Xu hướng thời trang nữ hè 2024: Màu sắc và kiểu dáng nổi bật',
  'xu-huong-thoi-trang-nu-he-2024-mau-sac-kieu-dang',
  '<h2>Hè 2024: Sắc màu rực rỡ lên ngôi</h2><p>Mùa hè 2024 chứng kiến sự trở lại của màu sắc táo bạo và kiểu dáng thoải mái, phóng khoáng.</p><h3>Màu hot nhất 2024</h3><p>Peach Fuzz (màu đào) là màu của năm theo Pantone. Bên cạnh đó, cobalt blue, sage green và terracotta tiếp tục thống trị.</p><h3>Kiểu dáng trending</h3><p>Váy midi linen, áo croptop oversize, quần wide-leg và set coordinated matching.</p>',
  'Xu hướng thời trang nữ hè 2024 — màu sắc, kiểu dáng và item nên có trong tủ quần áo mùa này.',
  'https://picsum.photos/seed/fashion-trend/1200/630',
  '01JTEMPLATE0CAT000000010',
  '01JTEMPLATE000000000000001',
  'published',
  '["thời-trang","nữ","xu-hướng","2024","hè"]',
  0,
  DATE_SUB(NOW(), INTERVAL 8 DAY),
  987, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0ART000000007',
  'Cách vệ sinh tai nghe đúng cách để kéo dài tuổi thọ',
  'cach-ve-sinh-tai-nghe-dung-cach',
  '<h2>Vệ sinh tai nghe — bước quan trọng thường bị bỏ qua</h2><p>Tai nghe tiếp xúc trực tiếp với tai, mồ hôi và bụi bẩn mỗi ngày. Vệ sinh đúng cách sẽ kéo dài tuổi thọ và bảo vệ sức khỏe.</p><h3>Tai nghe in-ear</h3><p>Tháo tip silicone, ngâm nước ấm 10 phút, lau khô. Dùng tăm bông nhúng cồn 70° lau lưới lọc âm thanh.</p><h3>Tai nghe over-ear</h3><p>Tháo ear cushion nếu được. Lau bằng khăn ẩm, không để nước vào cổng sạc.</p>',
  'Hướng dẫn vệ sinh tai nghe đúng cách — in-ear, over-ear, TWS. Giữ âm thanh tốt và kéo dài tuổi thọ sản phẩm.',
  'https://picsum.photos/seed/headphone-clean/1200/630',
  '01JTEMPLATE0CAT000000011',
  '01JTEMPLATE000000000000001',
  'published',
  '["tai-nghe","bảo-dưỡng","hướng-dẫn","vệ-sinh"]',
  0,
  DATE_SUB(NOW(), INTERVAL 20 DAY),
  756, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0ART000000008',
  'Sách hay nên đọc trong tháng 6 — Tổng hợp biên tập viên',
  'sach-hay-nen-doc-thang-6-tong-hop-bien-tap-vien',
  '<h2>Sách hay tháng 6/2024</h2><p>Biên tập viên của chúng tôi đã đọc và chọn lọc 5 cuốn sách đáng đọc nhất tháng 6 này, phù hợp cho những buổi chiều nghỉ ngơi.</p><h3>1. Atomic Habits — James Clear</h3><p>Bí quyết xây dựng thói quen tốt và từ bỏ thói quen xấu qua những thay đổi 1% mỗi ngày.</p><h3>2. The Psychology of Money — Morgan Housel</h3><p>19 câu chuyện ngắn về tài chính cá nhân, giúp bạn hiểu mối quan hệ giữa tiền bạc và hành vi con người.</p>',
  'Top 5 cuốn sách hay nhất tháng 6 được biên tập viên gợi ý — từ self-help đến tài chính và khoa học.',
  'https://picsum.photos/seed/books-june/1200/630',
  '01JTEMPLATE0CAT000000010',
  '01JTEMPLATE000000000000001',
  'published',
  '["sách","đọc-sách","gợi-ý","tháng-6"]',
  0,
  DATE_SUB(NOW(), INTERVAL 2 DAY),
  654, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0ART000000009',
  'Freeship toàn quốc tháng 6: Mua từ 199K miễn phí vận chuyển',
  'freeship-toan-quoc-thang-6',
  '<h2>Ưu đãi freeship tháng 6</h2><p>Trong suốt tháng 6/2024, tất cả đơn hàng từ 199.000đ trở lên đều được miễn phí vận chuyển toàn quốc, không giới hạn vùng.</p><h3>Điều kiện áp dụng</h3><ul><li>Đơn hàng tối thiểu 199.000đ (sau khi áp mã giảm giá nếu có)</li><li>Giao trong 2-5 ngày làm việc tùy vùng</li><li>Không áp dụng cho mặt hàng siêu trường siêu trọng</li></ul><h3>Mã thêm ưu đãi</h3><p>Nhập <strong>JUNE10</strong> để được giảm thêm 10% cho đơn đầu tiên trong tháng.</p>',
  'Toàn bộ đơn từ 199K được freeship tháng 6 toàn quốc. Nhập JUNE10 giảm thêm 10% đơn đầu tiên.',
  'https://picsum.photos/seed/freeship/1200/630',
  '01JTEMPLATE0CAT000000012',
  '01JTEMPLATE000000000000001',
  'published',
  '["freeship","khuyến-mãi","vận-chuyển","tháng-6"]',
  1,
  DATE_SUB(NOW(), INTERVAL 4 DAY),
  2345, NULL, NOW(), NOW()
),
(
  '01JTEMPLATE0ART000000010',
  'Hướng dẫn bảo quản giày sneaker đúng cách',
  'huong-dan-bao-quan-giay-sneaker-dung-cach',
  '<h2>Giày sneaker trắng luôn trắng</h2><p>Sneaker trắng đẹp nhưng rất khó giữ sạch. Đây là bí quyết từ những sneakerhead chuyên nghiệp.</p><h3>Vệ sinh hằng ngày</h3><p>Dùng cọ mềm lau khô bụi sau mỗi lần đi. Tránh để lâu mới xử lý vì bụi ngấm vào chất liệu.</p><h3>Làm sạch sâu</h3><p>Pha dung dịch oxy già và bột nở theo tỉ lệ 1:2, phết lên đế và phơi nắng 2 giờ. Đế trắng tinh như mới.</p><h3>Bảo quản lâu dài</h3><p>Dùng shoe tree để giữ form giày. Bọc giấy acid-free và bảo quản trong hộp gốc.</p>',
  'Bí quyết bảo quản và làm sạch sneaker như mới — vệ sinh hằng ngày, làm sạch sâu và lưu trữ đúng cách.',
  'https://picsum.photos/seed/sneaker-care/1200/630',
  '01JTEMPLATE0CAT000000011',
  '01JTEMPLATE000000000000001',
  'published',
  '["sneaker","giày","bảo-quản","hướng-dẫn"]',
  0,
  DATE_SUB(NOW(), INTERVAL 12 DAY),
  891, NULL, NOW(), NOW()
);

SET FOREIGN_KEY_CHECKS = 1;

SELECT CONCAT(
  'WebTemplate seed done: ',
  (SELECT COUNT(*) FROM categories WHERE type = 'product'), ' danh mục sản phẩm, ',
  (SELECT COUNT(*) FROM products), ' sản phẩm, ',
  (SELECT COUNT(*) FROM articles), ' bài viết'
) AS result;
