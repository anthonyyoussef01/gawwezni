# 🌺 Gawwezni Wedding Assistant

*A culturally-aware wedding planning chatbot for Egyptian weddings*

![Wedding Celebration](https://example.com/egyptian-wedding-banner.jpg)

## 🌟 Features
- 💬 Bilingual Arabic/English conversation support
- 📜 Traditional Egyptian wedding ritual guidance
- 🎶 Curated playlist suggestions from classic Egyptian artists
- 📅 Cultural protocol timeline planner
- 💍 Vendor recommendations (florists, henna artists, etc.)

## 🚀 Quick Start
```bash
npm install
cp .env.example .env
npm run dev
```

## 🔧 Configuration
Create `.env` file with:
```ini
GROQ_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
# Add other Egyptian-specific configurations here
```

## 📚 API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Main chat interface |

## 🌍 Cultural Data Structure
CSV files should include:
```csv
ritual_name,description,region,traditional_song
"Zaffa","Traditional wedding procession","Cairo","El Zaffa"
```

## 🏁 Deployment
Recommended Egyptian hosting providers:
- [Egyptian Cloud](https://www.egyptiancloud.com)
- [Nile Hosting](https://nilehosting.eg)

💡 Pro Tip: Enable Arabic language optimization in your hosting panel!

---
🕌 Developed with ❤️ for Egyptian wedding traditions