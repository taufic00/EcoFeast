# 🌱 EcoFeast — Setup Guide (पूरी जानकारी)

यह एक working starter project है — React frontend + Supabase database/auth + Gemini AI freshness detection। नीचे हर step explain किया गया है कि क्या install करना है, कहाँ files रखनी हैं, कैसे connect करना है।

---

## 📁 Folder Structure (क्यों ऐसा बनाया)

```
ecofeast/
├── frontend/                  ← पूरी website यहीं है (React app)
│   ├── src/
│   │   ├── main.jsx            ← app शुरू यहाँ से होता है
│   │   ├── App.jsx             ← सारे pages की routing यहाँ है
│   │   ├── index.css           ← Tailwind styling
│   │   ├── lib/
│   │   │   ├── supabaseClient.js ← database से connection
│   │   │   └── AuthContext.jsx   ← login state पूरे app में share होता है
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx     ← role (donor/ngo) देखकर सही page दिखाता है
│   │   │   ├── DonorDashboard.jsx  ← food upload + AI freshness check
│   │   │   └── NGODashboard.jsx    ← nearby food देखना + claim करना
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   └── utils/
│   │       ├── freshnessCheck.js  ← AI logic (Gemini API call)
│   │       └── matching.js        ← NGO matching + distance calculation
│   ├── package.json            ← कौन सी libraries चाहिए, यहाँ लिखा है
│   ├── .env.example             ← isko copy करके .env बनाओ
│   └── vite.config.js
├── database/
│   └── schema.sql              ← Supabase में paste करके run करना है
└── README.md                   ← यही file
```

**Logic:** `utils/` में pure functions हैं (AI call, distance calculation) — इन्हें कोई भी page import कर सकता है। `pages/` में हर screen है। `lib/` में connections (database, auth) हैं जो पूरे app में share होते हैं। यही proper React project structure है।

---

## 🔧 STEP 1 — Install करना (एक बार सबकुछ install करो)

### आपके computer पर चाहिए:
1. **Node.js** (v18+) — [nodejs.org](https://nodejs.org) से download करो, install करो
2. **VS Code** (या कोई भी code editor)
3. **Git** (optional, GitHub पर push करने के लिए)

### Terminal खोलो और check करो install हुआ या नहीं:
```bash
node -v      # v18.x.x या ऊपर दिखना चाहिए
npm -v
```

### Project folder में जाओ और dependencies install करो:
```bash
cd ecofeast/frontend
npm install
```
यह `package.json` में लिखी सारी libraries (React, Supabase, Tailwind) automatically install कर देगा — `node_modules` folder बन जाएगा (यह अपने आप बनता है, इसे मत छेड़ो)।

---

## 🗄️ STEP 2 — Supabase Setup (Database + Auth + Storage)

Supabase = free backend (database + login system + file storage), बिना खुद server code लिखे।

1. [supabase.com](https://supabase.com) पर जाओ, free account बनाओ
2. **"New Project"** बनाओ — कोई भी नाम दो, password set करो, region "Mumbai" (या नज़दीक) चुनो
3. Project बनने के बाद, left sidebar में **SQL Editor** खोलो
4. `database/schema.sql` file का पूरा content copy करके वहाँ paste करो, **RUN** दबाओ
   - यह automatically 4 tables बना देगा: `profiles`, `food_items`, `claims`, `impact_log`
   - एक storage bucket भी बन जाएगा food images के लिए
5. left sidebar में **Project Settings → API** पर जाओ:
   - `Project URL` copy करो
   - `anon public` key copy करो

---

## 🔑 STEP 3 — Gemini API Key (AI Freshness Detection के लिए)

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) पर जाओ (Google account से login)
2. **"Create API Key"** दबाओ, key copy करो (free tier काफी है student project के लिए)

---

## ⚙️ STEP 4 — .env File बनाना (Keys यहाँ जाती हैं)

`frontend` folder में `.env.example` को copy करके `.env` नाम की नई file बनाओ:

```bash
cd frontend
cp .env.example .env
```

फिर `.env` file खोलो और अपनी असली values भरो:
```
VITE_SUPABASE_URL=https://tumhara-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=tumhari-anon-key
VITE_GEMINI_API_KEY=tumhari-gemini-key
```

⚠️ **`.env` file कभी GitHub पर push मत करना** — इसमें secret keys हैं (`.gitignore` में already add है, so सुरक्षित है)।

---

## ▶️ STEP 5 — Project Run करना

```bash
cd frontend
npm run dev
```

Terminal में एक link दिखेगा जैसे `http://localhost:5173` — उसे browser में खोलो। ऐप चलने लगेगा।

---

## 🧪 STEP 6 — Test कैसे करो (पूरा flow)

1. **Register** पर जाओ → एक "Donor" account बनाओ (role = donor), location allow करो
2. Logout करके फिर से Register करो → इस बार "NGO" role चुनो
3. Donor account से login करो → Dashboard में food photo upload करो (कोई भी खाने की photo) + quantity भरो
   - AI automatically freshness score देगा (10-15 seconds लग सकते हैं)
4. Logout करके NGO account से login करो → वो food item दिखेगा distance के साथ
5. **"Claim"** button दबाओ → claim database में save हो जाएगा

अगर यह पूरा flow काम कर गया, तो **core project ready है** ✅

---

## 🌍 STEP 7 — Deploy करना (दुनिया को दिखाने के लिए)

Free deployment के लिए **Vercel** सबसे आसान है:
1. GitHub पर project push करो
2. [vercel.com](https://vercel.com) पर जाओ, GitHub से sign in करो
3. "Import Project" करो, अपना repo चुनो
4. **Root Directory** को `frontend` set करो
5. Environment Variables में वही 3 keys (.env वाली) डालो
6. Deploy दबाओ — 2 मिनट में live link मिल जाएगा

---

## 🧩 हर File कैसे एक-दूसरे से Connect है (Data Flow)

```
User photo upload करता है (DonorDashboard.jsx)
        ↓
freshnessCheck.js → Gemini API को image भेजता है → score वापस आता है
        ↓
supabaseClient.js → image Storage में save, food_items table में entry
        ↓
NGO का Dashboard (NGODashboard.jsx) खुलता है
        ↓
matching.js → distance calculate करता है हर food item का NGO से
        ↓
sorted list दिखती है (nearest + freshest पहले)
        ↓
NGO "Claim" दबाता है → claims table में entry बनती है
```

---

## 🚀 PPT के हिसाब से आगे क्या add करना है (Future Scope)

यह starter सिर्फ core flow (upload → AI check → match → claim) cover करता है। PPT में दिखाई presentation के हिसाब से आगे ये add करो:

| Feature | कैसे add करें |
|---|---|
| Sustainability Dashboard (charts) | `recharts` library install करो, `impact_log` table से data लेकर graph बनाओ |
| Multilingual (Hindi/Marathi) | `react-i18next` library use करो |
| Route optimization (map दिखाना) | `leaflet` + `react-leaflet` library, OpenStreetMap free है |
| Mock Interview / Assessment engine | अलग page बनाओ जो Gemini से conversational Q&A कराए |
| Mobile app | यही React code React Native में convert हो सकता है (बाद का काम) |

---

## ❓ Common Problems

- **"Supabase env variables missing"** → `.env` file ठीक से भरी नहीं है, फिर से check करो, और dev server restart करो (`Ctrl+C` फिर `npm run dev`)
- **Image upload fail** → Supabase Storage bucket "food-images" public है ना, ये check करो (Storage tab में)
- **AI freshness score नहीं आ रहा** → Gemini API key सही है ना check करो, या free tier की daily limit खत्म तो नहीं हुई

---

अगर कोई specific error आए तो वो error message मुझे भेजो, मैं ठीक करके बताऊँगा।
