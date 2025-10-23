# STL Viewer

Jednoduchá webová aplikace pro zobrazování STL souborů vytvořená podle zadání v `copilot.md`.

## ✨ Funkce

- **3D zobrazování STL souborů** - podpora ASCII i binárních STL formátů
- **Interaktivní ovládání**:
  - Rotace modelu tažením myši
  - Zoom kolečkem myši
  - Automatické centrování a přizpůsobení kamery
- **Responzivní design** - přizpůsobuje se velikosti okna
- **Bez závislostí** - funguje přímo z disku (`file://` protokol)
- **Přístupnost** - ARIA labely a stavové hlášky

## 🚀 Použití

1. **Otevřete `index.html`** přímo v prohlížeči (dvojklik na soubor)
2. **Klikněte na "Choose File"** a vyberte STL soubor
3. **Model se automaticky načte** a vycentruje
4. **Ovládání**:
   - Táhněte myší pro rotaci
   - Používejte kolečko myši pro zoom

## 📁 Struktura projektu

```
├── index.html              # Hlavní HTML soubor
├── main.js                 # Aplikační logika
├── test-cube.stl           # Testovací STL soubor (kostka)
└── three/                  # Three.js knihovny
    ├── three.min.js        # Hlavní Three.js knihovna
    ├── STLLoader-standalone.js  # Upravený STL loader
    └── STLLoader.js        # Originální STL loader (nepoužíván)
```

## 🎯 Implementované funkce

### ✅ Požadavky ze zadání

- [x] **Inicializace scény** - scéna, kamera (FOV 60°), renderer s antialias
- [x] **Ambient + directional světlo** - pro správné osvětlení modelů
- [x] **File input** pro výběr STL souborů
- [x] **FileReader + STLLoader** - načítání a parsování STL
- [x] **Automatické centrování** a přizpůsobení kamery na bounding box
- [x] **Mouse ovládání** - rotace tažením, zoom kolečkem (bez OrbitControls)
- [x] **UI & status** - nadpis, file input, stavové hlášky
- [x] **Responzivita** - přepočítání při změně velikosti okna
- [x] **Error handling** - ošetření nevalidních STL a WebGL
- [x] **Clean code** - strukturovaný kód s komentáři
- [x] **A11y** - aria-label, role="status"

### 🎨 Dodatečné funkce

- Tmavý vzhled s moderním UI
- Barevný materiál pro lepší vizualizaci
- Stíny pro prostorový efekt
- Pokročilé světelné nastavení

## 🌐 Kompatibilita

- **Chrome/Chromium** ✅
- **Firefox** ✅ 
- **Edge** ✅
- **Safari** ⚠️ (best effort)

## 🧪 Testování

Použijte přiložený `test-cube.stl` soubor pro rychlé otestování funkčnosti.

## 🔧 Technické detaily

- **Three.js r155** - 3D rendering
- **WebGL** - akcelerace GPU
- **Vanilla JavaScript** - žádné dodatečné závislosti
- **CSS3** - moderní stylování
- **HTML5 File API** - načítání souborů

Aplikace je navržena pro jednoduché použití bez nutnosti build procesu nebo serveru.