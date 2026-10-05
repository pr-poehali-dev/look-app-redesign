CREATE TABLE IF NOT EXISTS t_p96441965_look_app_redesign.mobile_api_services (
  name VARCHAR(80) PRIMARY KEY,
  function_id VARCHAR(40) NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p96441965_look_app_redesign.mobile_api_services (name, function_id, enabled) VALUES
  ('auth','075d6280-020a-48ce-a5e4-64eb3291a01e',TRUE),
  ('feed','f58115ec-de09-405d-a2db-08fe1cd958e1',TRUE),
  ('upload','78967386-1bfb-4070-9bb3-549cc5c00de6',TRUE),
  ('upload-chunked','25a6b99d-32f3-45a4-baf7-a088013ca292',TRUE),
  ('comments','4ceed9c1-422c-484e-806e-b3cc8af8b9ec',TRUE),
  ('follows','791bdb8d-0cb7-40b2-8a0c-e4a84b213fbc',TRUE),
  ('chat','86962a84-c16a-4104-9fd1-3bb76958389c',TRUE),
  ('notifications','8ae7d03e-5a18-4ff2-87f1-69f512fbacc3',TRUE),
  ('cart','32fdb3d3-b4f4-4dda-ac97-b0b038649b0f',TRUE),
  ('products','c4d3aa37-b7c2-4047-880a-ab17127da315',TRUE),
  ('reviews','624a62b6-f281-4c64-8f3d-7fc562265b8e',TRUE),
  ('articles','8a82c5d6-f598-4faf-a1ff-9e418c1823d8',TRUE),
  ('streams','54ce632b-903a-4de7-8f5f-e81fa2f42053',TRUE),
  ('signals','25a02f3d-0647-4142-999d-f84cb6302dd5',TRUE),
  ('support','c799ab49-0e91-4b94-8ec4-4325db5e1c73',TRUE),
  ('session','aa92a65b-92cc-4c07-a255-6e18811805bd',TRUE),
  ('legacy-otp-request','37ce1591-438c-4426-870f-1031b2c57d22',TRUE),
  ('legacy-otp-verify','b9c5bff7-0a7d-43c6-9e65-4d6365a68447',TRUE),
  ('password-reset','050dfa15-1d92-4aaf-9b87-55d04c9affa7',TRUE),
  ('ice-servers','53c7b2af-c5ea-4c37-bc28-154737d35d87',TRUE),
  ('admin','c578b52c-b9b6-47b3-9bcf-b6ab8405c4d7',TRUE),
  ('analytics','7b5c6c18-7098-4f9b-bf3c-e6ac50574c06',TRUE),
  ('gen-thumbnail','be575f5c-eb60-4522-ad3e-1b6527c85abb',FALSE),
  ('short-video-probe','d1cfb246-8b1e-4e41-8905-1966589c1420',FALSE),
  ('legacy-yadisk-zip','be1dc659-71d3-414a-9029-c3bc7de92bf2',FALSE),
  ('reupload-legacy','d60ef7bd-d96d-4388-9c4a-637a822e9313',FALSE),
  ('import-firebase-users','e4135c0e-d218-4ce3-bb17-1834be6fcfd0',FALSE),
  ('email-send','cb9f8edd-ee1d-436d-95cb-e07d3b4655b0',FALSE),
  ('legacy-hide-broken','9d18d13e-1ce1-4aa7-ae13-3e4be57e44b4',FALSE),
  ('legacy-extract-7z','36158ddd-3a04-4aa2-af12-0c3d09f9dbe9',FALSE),
  ('legacy-fetch-media','57318c7a-4812-45ac-8609-2790c021545e',FALSE),
  ('legacy-import-media','9ebae380-9dc6-4e3f-b5cb-d636b6ca77f2',FALSE),
  ('legacy-7z-list','6a6e5bbb-2af4-4e5f-ba91-38e17c2420a4',FALSE),
  ('legacy-import-sql','61ce0917-98cb-4caa-9e74-773c816f46f0',FALSE),
  ('legacy-sql-explore','cc5c1904-8f26-4310-b400-904296563b8d',FALSE),
  ('legacy-fetch-sql','9a112661-17f2-4932-8dbe-4088a7665239',FALSE),
  ('legacy-yadisk-list','cdec7597-3577-4618-8457-a10be712c302',FALSE),
  ('legacy-archive','03134b9c-4f0f-4e39-af7a-a52bb56b1f3a',FALSE),
  ('reupload-videos','eb443a8e-b2e9-45c0-a29d-b16c903ace99',FALSE),
  ('import-from-shortvideo','d43a0739-b87d-4876-83c9-76ad7ded193f',FALSE),
  ('boards-api','4b244d4d-3141-468d-93cc-3b1f106390ca',TRUE),
  ('download-media','b5faf1bc-6976-47c6-984e-e21c66d4c879',TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO t_p96441965_look_app_redesign.app_settings (key, value) VALUES ('mobile_api_new_default', 'allow')
ON CONFLICT (key) DO NOTHING;