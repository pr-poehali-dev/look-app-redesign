UPDATE t_p96441965_look_app_redesign.app_users
SET age_confirmed = CASE WHEN birth_date <= (CURRENT_DATE - INTERVAL '18 years') THEN 18 ELSE 14 END
WHERE birth_date IS NOT NULL AND age_confirmed IS NULL;

UPDATE t_p96441965_look_app_redesign.app_users SET birth_date = NULL WHERE birth_date IS NOT NULL;