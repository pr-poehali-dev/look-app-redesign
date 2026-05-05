module.exports = {
  listenPort: parseInt(process.env.PORT || '4001', 10),
  announcedIp: process.env.ANNOUNCED_IP || '155.212.128.190',
  rtcMinPort: parseInt(process.env.RTC_MIN_PORT || '40000', 10),
  rtcMaxPort: parseInt(process.env.RTC_MAX_PORT || '40200', 10),
  workerLogLevel: 'warn',
  mediaCodecs: [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: { 'x-google-start-bitrate': 1000 },
    },
    {
      kind: 'video',
      mimeType: 'video/H264',
      clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '42e01f',
        'level-asymmetry-allowed': 1,
        'x-google-start-bitrate': 1000,
      },
    },
  ],
};
