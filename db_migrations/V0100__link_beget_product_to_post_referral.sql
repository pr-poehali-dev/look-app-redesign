UPDATE t_p96441965_look_app_redesign.products SET video_id = 436, updated_at = now() WHERE id = 7;
INSERT INTO t_p96441965_look_app_redesign.referral_clicks (product_id, referral_code, referrer_user_id)
SELECT 7, '7-testref01', 'u_testuser01'
WHERE NOT EXISTS (SELECT 1 FROM t_p96441965_look_app_redesign.referral_clicks WHERE product_id = 7 AND referrer_user_id = 'u_testuser01');