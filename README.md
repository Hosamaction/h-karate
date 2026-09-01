# H Karate — Professional Tournament Scoring System

![Version](https://img.shields.io/badge/version-0.6.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
![License](https://img.shields.io/badge/license-Proprietary-red)

Professional desktop application for karate tournament scoring with real-time web judges, OBS overlay, and multi-language support.

## Features

- **3 Scoring Modes:** Kumite (fighting), Kata 1v1, Kata All-In tournaments
- **Web Judges:** Connect unlimited judges via QR code (no app install needed)
- **OBS Overlay:** Live streaming support with transparent scoreboard
- **6 Languages:** English, Arabic (RTL), Japanese, French, German, Spanish
- **Tournament Tools:** Brackets, history, competitor database
- **Offline First:** 7-day grace period for offline tournaments
- **Professional UX:** Dark theme, sound effects, keyboard shortcuts

## Download

**Latest Release:** [v0.6.0](https://github.com/hosam-sheboun/h-karate/releases/latest)

- [Windows Installer](https://github.com/hosam-sheboun/h-karate/releases/download/v0.6.0/H-Karate-Scoring-Setup-0.6.0.exe) (Recommended)
- [Portable Version](https://github.com/hosam-sheboun/h-karate/releases/download/v0.6.0/H-Karate-Scoring-v0.6.0-portable.exe)

**System Requirements:**
- Windows 10/11 (64-bit)
- 4GB RAM minimum
- 200MB disk space

## Quick Start

1. Download and install H Karate
2. Purchase a license from [h-karate-app.web.app](https://h-karate-app.web.app/#pricing)
3. Drop your license file into the app
4. Start scoring!

## Documentation

- [Build Guide](BUILD-CHECKLIST.md)
- [Full Audit Report](AUDIT-REPORT.md)
- [License System](license-server/DEPLOY.md)

## Development

### Build from Source

```powershell
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build installers
npm run build
```

### Tech Stack

- **Framework:** Electron 37.x
- **Backend:** Express + Socket.IO
- **License:** Ed25519 + AES-256
- **Build:** electron-builder

## License

Proprietary software. See [LICENSE-SYSTEM.md](LICENSE-SYSTEM.md) for details.

## Support

- **Website:** https://h-karate-app.web.app
- **Email:** support@hkarate.app
- **Issues:** [GitHub Issues](https://github.com/hosam-sheboun/h-karate/issues)

## Author

**Hosam Sheboun**  
Built with ❤️ for the karate community

---

© 2026 H Karate. All rights reserved.
