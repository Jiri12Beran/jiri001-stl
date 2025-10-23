
## 🧩 Úkoly pro Copilot
1. **Inicializace scény** v `main.js`:
   - Vytvořit scénu, kameru (FOV ~60), renderer (`antialias: true`) a `<canvas>` přes celou obrazovku.
   - Přidat ambient + directional světlo.
2. **Načítání STL**:
   - V `index.html` mít `<input type="file" accept=".stl">`.
   - Použít `FileReader.readAsArrayBuffer` → `THREE.STLLoader().parse(...)`.
   - Po načtení **vycentrovat model** a **fitnout kameru** na bounding box.
3. **Ovládání modelu**:
   - Myší otáčet (drag) a zoomovat kolečkem (bez OrbitControls).
4. **UI & status**:
   - Jednoduché UI: nadpis, file input, textový stav („Ready / Loading / Error“).
5. **Responzivita**:
   - Při `resize` přepočítat kameru a velikost rendereru.
6. **Chyby & fallback**:
   - Ošetřit nevalidní STL a WebGL nepodporované prohlížeče.
7. **Kódová čistota**:
   - Strukturovaný kód, krátké funkce, základní komentáře k matematice 3D scény.

## 🧭 Pravidla pro AI
- **Nepřidávat** žádné importy, balíčky, CLI nebo build nástroje.
- Používat pouze `<script src="…">` na `three.min.js` a `STLLoader.js`.
- Zachovat strukturu uvedenou výše.
- Psaní kódu: jednoduchý, čitelný, bez nadbytečných tříd nebo frameworků.
- Komentovat klíčové části (inicializace, načtení, centrování, render smyčka).

## 🧑‍🦽 A11y
- `aria-label` pro `<input type="file">`
- Stavové hlášky přes prvek s `role="status"`

## ✅ Akceptační kritéria
- Otevření `index.html` přímo v prohlížeči zobrazí prázdnou scénu a UI.
- Po výběru `.stl` se model načte, **vycentruje**, kamera se **přizpůsobí** a model lze **otáčet a zoomovat**.
- Při změně velikosti okna se zobrazení **správně přepočítá**.
- Žádné chyby v konzoli, žádné potřeby příkazů v terminálu.

## 📝 Poznámky
- `three.min.js` a `STLLoader.js` jsou **lokální** soubory ve složce `/three/`.
- Aplikace musí fungovat i při otevření z disku (`file://`).
- Cílové prohlížeče: Chromium, Firefox, Edge. Safari „best effort“.
