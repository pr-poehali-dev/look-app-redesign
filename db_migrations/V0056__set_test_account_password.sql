UPDATE t_p96441965_look_app_redesign.app_users
SET password_hash = '99eaffc14e0e1c24d5522b1c28778cc47e668c88a4d0297ae5d0e82e6a07c86e',
    firebase_hash = NULL,
    firebase_salt = NULL,
    email_verified = TRUE,
    banned = FALSE
WHERE email = 'test@test';