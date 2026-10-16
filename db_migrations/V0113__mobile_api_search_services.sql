INSERT INTO mobile_api_services (name, function_id, enabled) VALUES
 ('search', '7f681f12-fcd3-45e4-aa45-38fccd3d0760', TRUE),
 ('brand-collabs', 'c8abec04-3371-4a40-9aa7-892ac2f3c18b', TRUE),
 ('feed-signals', '25a02f3d-0647-4142-999d-f84cb6302dd5', TRUE),
 ('get-user-videos', '075d6280-020a-48ce-a5e4-64eb3291a01e', TRUE)
ON CONFLICT DO NOTHING;