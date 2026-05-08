WITH hescom AS (
    INSERT INTO projects (name) VALUES ('HESCOM Survey Project') RETURNING id
),
haveri AS (
    INSERT INTO districts (project_id, name) SELECT id, 'HAVERI DISTRICT' FROM hescom RETURNING id
),
yagdir AS (
    INSERT INTO districts (project_id, name) SELECT id, 'YAGDIR DISTRICT' FROM hescom RETURNING id
),
bidar AS (
    INSERT INTO districts (project_id, name) SELECT id, 'BIDAR DISTRICT' FROM hescom RETURNING id
),
kalaburgi AS (
    INSERT INTO districts (project_id, name) SELECT id, 'KALABURGI DISTRICT' FROM hescom RETURNING id
)
INSERT INTO ulbs (project_id, district_id, name, type) VALUES
-- HAVERI
((SELECT id FROM hescom), (SELECT id FROM haveri), 'CMC Haveri', 'CMC'),
((SELECT id FROM hescom), (SELECT id FROM haveri), 'CMC Ranibennur', 'CMC'),
((SELECT id FROM hescom), (SELECT id FROM haveri), 'TMC Byadgi', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM haveri), 'TMC Hangal', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM haveri), 'TMC Savanur', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM haveri), 'TMC Shiggaon', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM haveri), 'TMC Bankapur', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM haveri), 'TP Hirekerur', 'TP'),
((SELECT id FROM hescom), (SELECT id FROM haveri), 'TP Guttal', 'TP'),
((SELECT id FROM hescom), (SELECT id FROM haveri), 'TP Rattihalli', 'TP'),

-- YAGDIR
((SELECT id FROM hescom), (SELECT id FROM yagdir), 'CMC YAGDIR', 'CMC'),
((SELECT id FROM hescom), (SELECT id FROM yagdir), 'CMC SHAHAPUR', 'CMC'),
((SELECT id FROM hescom), (SELECT id FROM yagdir), 'CMC SHORAPUR', 'CMC'),
((SELECT id FROM hescom), (SELECT id FROM yagdir), 'TMC GURMITKAL', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM yagdir), 'TMC KAKKERA', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM yagdir), 'TMC KEMBHAVI', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM yagdir), 'TP HUNASAGI', 'TP'),

-- BIDAR
((SELECT id FROM hescom), (SELECT id FROM bidar), 'CMC Basavakalyan', 'CMC'),
((SELECT id FROM hescom), (SELECT id FROM bidar), 'TMC Bhalki', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM bidar), 'TMC Humnabad', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM bidar), 'TMC Chitguppa', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM bidar), 'TMC Hallikhed(B)', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM bidar), 'TP Aurad(B)', 'TP'),

-- KALABURGI
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Afzalpur TMC', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Aland TMC', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Chinchol TMC', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Chittapur TMC', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Jewargi TMC', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Sedam TMC', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Shahabad CMC', 'CMC'),
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Wadi TMC', 'TMC'),
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Kalagi Tp', 'TP'),
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Kamalapur TP', 'TP'),
((SELECT id FROM hescom), (SELECT id FROM kalaburgi), 'Yadrami TP', 'TP');
