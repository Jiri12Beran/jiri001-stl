// STL Viewer - Hlavní aplikační logika
// Bez závislostí na externích knihovnách kromě Three.js

// Globální proměnné pro 3D scénu
let scene, camera, renderer, currentModel;
let isMouseDown = false;
let isRightMouseDown = false;
let mousePosition = { x: 0, y: 0 };
let cameraPosition = { phi: 0, theta: Math.PI / 2, radius: 5 };
let cameraTarget = { x: 0, y: 0, z: 0 }; // Střed pohledu pro panning
let isWireframe = false;

// Touch handling proměnné pro mobilní zařízení
let touches = [];
let lastTouchDistance = 0;
let isTouchRotating = false;
let isPinching = false;
let isPanning = false;
let longPressTimer = null;
let longPressDelay = 600; // 600ms pro aktivaci panning módu (delší pro Safari)
let initialTouchPosition = { x: 0, y: 0 };
let touchStartTime = 0;

// UI elementy - budou načteny až po načtení DOM
let fileInput, statusElement, canvasContainer;
let wireframeToggle, panModeToggle;
let colorPicker;
let lightingSlider;
let lightingValue;
let touchIndicator;
let currentLightingIntensity = 1.0;
let manualPanMode = false; // Ruční režim posunu pomocí tlačítka

// Referece na světla pro dynamickou změnu intenzity
let ambientLight, directionalLight, fillLight, backLight;

// Inicializace aplikace po načtení stránky
document.addEventListener('DOMContentLoaded', function() {
    // Nejprve inicializovat UI elementy
    initUIElements();
    checkWebGLSupport();
    initScene();
    setupEventListeners();
    updateStatus('loading', 'Načítání výchozího modelu...');
    
    // Automatické načtení výchozího STL souboru
    loadDefaultSTL();
});

/**
 * Inicializace UI elementů
 */
function initUIElements() {
    fileInput = document.getElementById('fileInput');
    statusElement = document.getElementById('status');
    canvasContainer = document.getElementById('canvas-container');
    wireframeToggle = document.getElementById('wireframeToggle');
    panModeToggle = document.getElementById('panModeToggle');
    lightingSlider = document.getElementById('lightingSlider');
    lightingValue = document.getElementById('lightingValue');
    colorPicker = document.getElementById('colorPicker');
    touchIndicator = document.getElementById('touchIndicator');
}

/**
 * Kontrola podpory WebGL v prohlížeči
 */
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!context) {
            throw new Error('WebGL není podporováno');
        }
    } catch (error) {
        updateStatus('error', 'Chyba: WebGL není podporováno v tomto prohlížeči');
        console.error('WebGL test failed:', error);
    }
}

/**
 * Inicializace 3D scény, kamery, rendereru a světel
 */
function initScene() {
    try {
        console.log('Inicializuji 3D scénu...');
        
        // Kontrola, jestli máme canvas kontejner
        if (!canvasContainer) {
            throw new Error('Canvas kontejner nebyl nalezen');
        }
        
        // Vytvoření scény
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2a2a2a);
        console.log('Scéna vytvořena');

        // Nastavení kamery (perspektivní s FOV ~60°)
        const aspect = window.innerWidth / window.innerHeight;
        camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        updateCameraPosition();
        console.log('Kamera vytvořena');

        // Vytvoření rendereru s antialiasem
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        console.log('Renderer vytvořen');
        
        // Přidání canvas do kontejneru
        canvasContainer.appendChild(renderer.domElement);
        console.log('Canvas přidán do kontejneru');

        // Přidání světel
        setupLighting();
        console.log('Osvětlení nastaveno');

        // Spuštění render smyčky
        animate();
        console.log('Animační smyčka spuštěna');
        
        updateStatus('ready', '3D scéna inicializována');

    } catch (error) {
        updateStatus('error', 'Chyba při inicializaci 3D scény: ' + error.message);
        console.error('Scene initialization failed:', error);
    }
}

/**
 * Nastavení osvětlení scény
 */
function setupLighting() {
    // Ambient světlo pro základní osvětlení - ukládáme referenci pro dynamické změny
    ambientLight = new THREE.AmbientLight(0x404040, 1.2);
    scene.add(ambientLight);

    // Hlavní směrové světlo - ukládáme referenci pro dynamické změny
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Druhé směrové světlo pro vyplnění stínů - ukládáme referenci
    fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, -5, -5);
    scene.add(fillLight);

    // Další světlo z opačné strany pro rovnoměrné osvětlení - ukládáme referenci
    backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(-3, 2, -3);
    scene.add(backLight);
}

/**
 * Nastavení event listenerů pro UI a ovládání
 */
function setupEventListeners() {
    // UI elementy jsou už inicializované v initUIElements()
    
    // File input pro načítání STL souborů
    fileInput.addEventListener('change', handleFileSelect);

    // Wireframe toggle tlačítko
    if (wireframeToggle) {
        wireframeToggle.addEventListener('click', toggleWireframe);
    }

    // Pan mode toggle tlačítko
    if (panModeToggle) {
        panModeToggle.addEventListener('click', togglePanMode);
    }

    // Lighting slider pro intenzitu osvětlení
    if (lightingSlider) {
        lightingSlider.addEventListener('input', changeLightingIntensity);
        // Inicializace zobrazení hodnoty
        updateLightingDisplay(lightingSlider.value);
    }

    // Color picker pro změnu barvy modelu
    if (colorPicker) {
        colorPicker.addEventListener('change', changeModelColor);
    }

    // Mouse události pro rotaci modelu
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);

    // Wheel event pro zoom
    renderer.domElement.addEventListener('wheel', onMouseWheel);

    // Resize event pro responzivitu
    window.addEventListener('resize', onWindowResize);

    // Zabránění kontextovému menu na canvas
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch události pro mobilní zařízení
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: false });
}

/**
 * Automatické načtení výchozího STL souboru
 */


function loadDefaultSTL() {
    try {
        // Jednoduchá kostka jako výchozí model
        const geometry = new THREE.BoxGeometry(4, 4, 4);
        displayModel(geometry);
        updateStatus('ready', 'Načten výchozí model. Můžete načíst vlastní STL soubor pomocí tlačítka "Vybrat soubor".');
        
    } catch (error) {
        updateStatus('error', 'Chyba při vytváření výchozího modelu: ' + error.message);
        console.error('Default model creation failed:', error);
    }
}

/**
 * Zpracování výběru souboru
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log('Žádný soubor nebyl vybrán');
        return;
    }

    console.log('Vybrán soubor:', file.name, 'velikost:', file.size, 'bytes');

    if (!file.name.toLowerCase().endsWith('.stl')) {
        updateStatus('error', 'Chyba: Vyberte prosím STL soubor');
        return;
    }

    updateStatus('loading', 'Načítání STL souboru...');
    loadSTLFile(file);
}

/**
 * Načtení a parsování STL souboru
 */
function loadSTLFile(file) {
    console.log('Začínám načítání souboru:', file.name);
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            console.log('Soubor načten, velikost dat:', event.target.result.byteLength, 'bytes');
            
            const arrayBuffer = event.target.result;
            
            // Vytvoření STL loaderu
            const loader = new SimpleSTLLoader();
            
            console.log('Začínám parsování STL...');
            
            // Parsování STL dat
            const geometry = loader.parse(arrayBuffer);
            
            console.log('STL naparsováno, počet vrcholů:', geometry.attributes.position.count);
            
            if (!geometry || geometry.attributes.position.count === 0) {
                throw new Error('STL soubor neobsahuje žádná platná data');
            }

            // Zobrazení modelu ve scéně
            console.log('Zobrazuji model...');
            displayModel(geometry);
            updateStatus('ready', `Načteno: ${file.name} (${geometry.attributes.position.count / 3} trojúhelníků)`);

        } catch (error) {
            updateStatus('error', 'Chyba při načítání STL: ' + error.message);
            console.error('STL loading failed:', error);
        }
    };

    reader.onerror = function() {
        updateStatus('error', 'Chyba při čtení souboru');
        console.error('FileReader error');
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Zobrazení 3D modelu ve scéně
 */
function displayModel(geometry) {
    console.log('displayModel() zavolána');
    
    // Odstranění předchozího modelu
    if (currentModel) {
        console.log('Odstraňuji předchozí model');
        scene.remove(currentModel);
        currentModel.geometry.dispose();
        currentModel.material.dispose();
    }

    // Výpočet normál pro správné osvětlení
    console.log('Počítám normály...');
    geometry.computeVertexNormals();

    // Vytvoření materiálu s barvou z color pickeru
    const currentColor = colorPicker ? colorPicker.value : '#00ff88';
    console.log('Používám barvu:', currentColor);
    
    const material = new THREE.MeshStandardMaterial({
        color: parseInt(currentColor.replace('#', ''), 16),
        side: THREE.DoubleSide,
        metalness: 0.1,
        roughness: 0.8
    });

    // Vytvoření mesh objektu
    console.log('Vytvářím mesh objekt...');
    currentModel = new THREE.Mesh(geometry, material);
    currentModel.castShadow = true;
    currentModel.receiveShadow = true;

    // Přidání do scény
    console.log('Přidávám model do scény');
    scene.add(currentModel);

    // Reset wireframe stavu při načtení nového modelu
    isWireframe = false;
    if (wireframeToggle) {
        wireframeToggle.classList.remove('active');
        wireframeToggle.textContent = '📐 Drátový model';
    }

    // Reset lighting slideru při načtení nového modelu
    if (lightingSlider) {
        lightingSlider.value = 1.0;
        currentLightingIntensity = 1.0;
        updateLightingDisplay(1.0);
        // Obnovení základní intenzity světel
        changeLightingIntensity({ target: { value: 1.0 } });
    }

    // Vycentrování a přizpůsobení kamery
    console.log('Centruju kameru...');
    centerAndFitModel();
    
    console.log('Model úspěšně zobrazen');
}

/**
 * Vycentrování modelu a přizpůsobení kamery na bounding box
 */
function centerAndFitModel() {
    if (!currentModel) return;

    // Výpočet bounding boxu
    const box = new THREE.Box3().setFromObject(currentModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Vycentrování modelu do původu
    currentModel.position.copy(center.multiplyScalar(-1));

    // Reset camera target pro nový model
    cameraTarget.x = 0;
    cameraTarget.y = 0;
    cameraTarget.z = 0;

    // Nastavení vzdálenosti kamery podle velikosti modelu
    const maxDimension = Math.max(size.x, size.y, size.z);
    cameraPosition.radius = maxDimension * 1.5;

    // Omezení minimální a maximální vzdálenosti
    cameraPosition.radius = Math.max(cameraPosition.radius, 0.1);
    cameraPosition.radius = Math.min(cameraPosition.radius, 500);

    updateCameraPosition();
}

/**
 * Aktualizace pozice kamery podle sférických souřadnic
 */
function updateCameraPosition() {
    const { phi, theta, radius } = cameraPosition;
    
    camera.position.x = cameraTarget.x + radius * Math.sin(theta) * Math.cos(phi);
    camera.position.y = cameraTarget.y + radius * Math.cos(theta);
    camera.position.z = cameraTarget.z + radius * Math.sin(theta) * Math.sin(phi);
    
    camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
}

/**
 * Mouse down event - začátek rotace nebo posunu
 */
function onMouseDown(event) {
    if (event.button === 0) { // Levé tlačítko - rotace
        isMouseDown = true;
        renderer.domElement.style.cursor = 'grabbing';
    } else if (event.button === 2) { // Pravé tlačítko - posun
        isRightMouseDown = true;
        renderer.domElement.style.cursor = 'move';
    }
    
    mousePosition.x = event.clientX;
    mousePosition.y = event.clientY;
}

/**
 * Mouse move event - rotace nebo posun během tažení
 */
function onMouseMove(event) {
    if (!isMouseDown && !isRightMouseDown) return;

    const deltaX = event.clientX - mousePosition.x;
    const deltaY = event.clientY - mousePosition.y;

    if (isMouseDown) { // Levé tlačítko - rotace
        // Aktualizace úhlů kamery
        cameraPosition.phi += deltaX * 0.01;
        cameraPosition.theta += deltaY * 0.01;

        // Omezení vertikální rotace
        cameraPosition.theta = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPosition.theta));
    } else if (isRightMouseDown) { // Pravé tlačítko - posun
        // Výpočet směrů pro panning
        const panSpeed = 0.005 * cameraPosition.radius;
        
        // Pravý vektor kamery
        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3()));
        rightVector.normalize();
        
        // Horní vektor kamery
        const upVector = camera.up.clone();
        
        // Aplikace posunu
        cameraTarget.x += rightVector.x * deltaX * panSpeed + upVector.x * deltaY * panSpeed;
        cameraTarget.y += rightVector.y * deltaX * panSpeed + upVector.y * deltaY * panSpeed;
        cameraTarget.z += rightVector.z * deltaX * panSpeed + upVector.z * deltaY * panSpeed;
    }

    mousePosition.x = event.clientX;
    mousePosition.y = event.clientY;

    updateCameraPosition();
}

/**
 * Mouse up event - konec rotace nebo posunu
 */
function onMouseUp(event) {
    isMouseDown = false;
    isRightMouseDown = false;
    renderer.domElement.style.cursor = 'grab';
}

/**
 * Mouse wheel event - zoom
 */
function onMouseWheel(event) {
    event.preventDefault();
    
    const zoomSpeed = 0.1;
    const delta = event.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
    
    cameraPosition.radius *= delta;
    cameraPosition.radius = Math.max(0.1, Math.min(500, cameraPosition.radius));
    
    updateCameraPosition();
}

/**
 * Window resize event - responzivita
 */
function onWindowResize() {
    // Aktualizace poměru stran kamery
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Aktualizace velikosti rendereru
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Aktualizace stavu v UI
 */
function updateStatus(type, message) {
    if (statusElement) {
        statusElement.className = type;
        statusElement.textContent = message;
    } else {
        console.log(`Status: ${type} - ${message}`);
    }
}

/**
 * Změna barvy modelu
 */
function changeModelColor(event) {
    if (!currentModel) return;
    
    const newColor = event.target.value;
    
    // Správná konverze hex barvy - použití parseInt s base 16
    const hexColor = parseInt(newColor.replace('#', ''), 16);
    
    // Nastavení nové barvy
    currentModel.material.color.setHex(hexColor);
}



/**
 * Změna intenzity osvětlení
 */
function changeLightingIntensity(event) {
    const intensity = parseFloat(event.target.value);
    currentLightingIntensity = intensity;
    
    // Aktualizace intenzity všech světel podle základních poměrů
    if (ambientLight) {
        ambientLight.intensity = 1.2 * intensity;
    }
    if (directionalLight) {
        directionalLight.intensity = 1.5 * intensity;
    }
    if (fillLight) {
        fillLight.intensity = 0.8 * intensity;
    }
    if (backLight) {
        backLight.intensity = 0.5 * intensity;
    }
    
    // Aktualizace zobrazení hodnoty
    updateLightingDisplay(intensity);
}

/**
 * Aktualizace zobrazení hodnoty intenzity osvětlení
 */
function updateLightingDisplay(intensity) {
    if (lightingValue) {
        const percentage = Math.round(intensity * 100);
        lightingValue.textContent = percentage + '%';
    }
}

/**
 * Přepínání mezi drátovým a plným modelem
 */
function toggleWireframe() {
    if (!currentModel) return;
    
    isWireframe = !isWireframe;
    currentModel.material.wireframe = isWireframe;
    
    // Aktualizace UI tlačítka
    if (wireframeToggle) {
        if (isWireframe) {
            wireframeToggle.classList.add('active');
            wireframeToggle.textContent = '🔳 Plný model';
        } else {
            wireframeToggle.classList.remove('active');
            wireframeToggle.textContent = '📐 Drátový model';
        }
    }
}

/**
 * Touch události pro mobilní zařízení
 */

// Touch start - začátek dotyku
function onTouchStart(event) {
    event.preventDefault();
    event.stopPropagation();
    
    touches = Array.from(event.touches);
    console.log('Touch start, počet dotykových bodů:', touches.length);
    touchStartTime = Date.now();
    
    // Zrušit předchozí long press timer
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    
    if (touches.length === 1) {
        // Jeden prst - rotace nebo příprava na panning
        isTouchRotating = true;
        isPinching = false;
        isPanning = false;
        mousePosition.x = touches[0].clientX;
        mousePosition.y = touches[0].clientY;
        
        // Zapamatovat počáteční pozici
        initialTouchPosition.x = touches[0].clientX;
        initialTouchPosition.y = touches[0].clientY;
        
        // Spustit timer pro long press (panning) - s lepší detekcí pro Safari
        longPressTimer = setTimeout(() => {
            if (touches.length === 1 && isTouchRotating && !isPanning) {
                // Kontrola, že se prst nepohnul příliš (pro Safari)
                const currentTouch = touches[0] || event.touches[0];
                if (currentTouch) {
                    const deltaX = Math.abs(currentTouch.clientX - initialTouchPosition.x);
                    const deltaY = Math.abs(currentTouch.clientY - initialTouchPosition.y);
                    
                    if (deltaX < 15 && deltaY < 15) { // Tolerovat malý pohyb
                        // Přepnout na panning mód
                        isTouchRotating = false;
                        isPanning = true;
                        console.log('Long press detected - switching to panning mode');
                        showTouchIndicator('panning');
                        
                        // Vibrace pro feedback (pokud je podporována)
                        if (navigator.vibrate) {
                            navigator.vibrate([50]);
                        }
                        
                        // Audio feedback pro Safari (kde vibrace nemusí fungovat)
                        try {
                            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                            const oscillator = audioContext.createOscillator();
                            const gainNode = audioContext.createGain();
                            
                            oscillator.connect(gainNode);
                            gainNode.connect(audioContext.destination);
                            
                            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
                            
                            oscillator.start(audioContext.currentTime);
                            oscillator.stop(audioContext.currentTime + 0.1);
                        } catch (e) {
                            console.log('Audio feedback not available');
                        }
                    }
                }
            }
        }, longPressDelay);
        
        // Zobrazit touch indikátor
        showTouchIndicator(1);
        
        // Vizuální feedback
        renderer.domElement.style.cursor = 'grabbing';
        
    } else if (touches.length === 2) {
        // Dva prsty - zoom (pinch)
        isTouchRotating = false;
        isPinching = true;
        isPanning = false;
        lastTouchDistance = getTouchDistance(touches[0], touches[1]);
        
        // Získat střed mezi dvěma prsty pro přesnější zoom
        const centerX = (touches[0].clientX + touches[1].clientX) / 2;
        const centerY = (touches[0].clientY + touches[1].clientY) / 2;
        mousePosition.x = centerX;
        mousePosition.y = centerY;
        
        // Zobrazit touch indikátor
        showTouchIndicator(2);
        
    } else {
        // Více než 2 prsty - zrušit všechny akce
        isTouchRotating = false;
        isPinching = false;
        isPanning = false;
        showTouchIndicator(touches.length);
    }
}

// Touch move - pohyb během dotyku
function onTouchMove(event) {
    event.preventDefault();
    event.stopPropagation();
    
    touches = Array.from(event.touches);
    
    // Pokud se prst pohne příliš během long press timeout, neaktivovat panning
    if (longPressTimer && isTouchRotating && touches.length === 1) {
        const moveThreshold = 20; // Zvýšený práh pro Safari
        const deltaX = Math.abs(touches[0].clientX - initialTouchPosition.x);
        const deltaY = Math.abs(touches[0].clientY - initialTouchPosition.y);
        
        if (deltaX > moveThreshold || deltaY > moveThreshold) {
            // Příliš velký pohyb - pokračovat v rotaci
            // Long press timer zůstává aktivní, ale nebude úspěšný
        }
    }
    
    if ((isTouchRotating || manualPanMode) && touches.length === 1) {
        const deltaX = touches[0].clientX - mousePosition.x;
        const deltaY = touches[0].clientY - mousePosition.y;
        
        if (manualPanMode || isPanning) {
            // Panning režim (manuální nebo automatický)
            console.log('Panning active (manual or auto), delta:', deltaX, deltaY);
            
            // Výpočet směrů pro panning - zvýšená citlivost pro Safari
            const panSpeed = 0.005 * Math.max(1, cameraPosition.radius * 0.1);
            
            // Pravý vektor kamery
            const rightVector = new THREE.Vector3();
            rightVector.crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3()));
            rightVector.normalize();
            
            // Horní vektor kamery
            const upVector = camera.up.clone();
            
            // Aplikace posunu s větší citlivostí
            cameraTarget.x += rightVector.x * deltaX * panSpeed + upVector.x * deltaY * panSpeed;
            cameraTarget.y += rightVector.y * deltaX * panSpeed + upVector.y * deltaY * panSpeed;
            cameraTarget.z += rightVector.z * deltaX * panSpeed + upVector.z * deltaY * panSpeed;
            
            updateCameraPosition();
        } else {
            // Rotace jedním prstem - upravená citlivost pro mobily
            const sensitivity = 0.008; // Snížená citlivost pro plynulejší pohyb
            
            cameraPosition.phi -= deltaX * sensitivity;
            cameraPosition.theta = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPosition.theta + deltaY * sensitivity));
            
            updateCameraPosition();
        }
        
        mousePosition.x = touches[0].clientX;
        mousePosition.y = touches[0].clientY;
        
    } else if (isPanning && touches.length === 1) {
        // Panning jedním prstem po dlouhém stisku
        const deltaX = touches[0].clientX - mousePosition.x;
        const deltaY = touches[0].clientY - mousePosition.y;
        
        console.log('Panning active, delta:', deltaX, deltaY);
        
        // Výpočet směrů pro panning - zvýšená citlivost pro Safari
        const panSpeed = 0.005 * Math.max(1, cameraPosition.radius * 0.1);
        
        // Pravý vektor kamery
        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3()));
        rightVector.normalize();
        
        // Horní vektor kamery
        const upVector = camera.up.clone();
        
        // Aplikace posunu s větší citlivostí
        cameraTarget.x += rightVector.x * deltaX * panSpeed + upVector.x * deltaY * panSpeed;
        cameraTarget.y += rightVector.y * deltaX * panSpeed + upVector.y * deltaY * panSpeed;
        cameraTarget.z += rightVector.z * deltaX * panSpeed + upVector.z * deltaY * panSpeed;
        
        updateCameraPosition();
        
        mousePosition.x = touches[0].clientX;
        mousePosition.y = touches[0].clientY;
        
    } else if (isPinching && touches.length === 2) {
        // Zoom pomocí pinch gestur - vylepšený
        const currentDistance = getTouchDistance(touches[0], touches[1]);
        const deltaDistance = currentDistance - lastTouchDistance;
        
        // Adaptivní zoom rychlost podle aktuální vzdálenosti kamery
        const zoomSpeed = Math.max(0.002, Math.min(0.02, cameraPosition.radius * 0.001));
        const zoomFactor = deltaDistance * zoomSpeed;
        
        // Logaritmický zoom pro přirozenější pocit
        const newRadius = cameraPosition.radius * (1 - zoomFactor);
        cameraPosition.radius = Math.max(0.1, Math.min(500, newRadius));
        
        updateCameraPosition();
        lastTouchDistance = currentDistance;
    }
}

// Touch end - konec dotyku
function onTouchEnd(event) {
    event.preventDefault();
    event.stopPropagation();
    
    touches = Array.from(event.touches);
    console.log('Touch end, zbývající dotyky:', touches.length, 'isPanning:', isPanning);
    
    // Zrušit long press timer
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    
    // Aktualizovat touch indikátor
    if (touches.length === 0) {
        hideTouchIndicator();
    } else {
        showTouchIndicator(touches.length);
    }
    
    if (touches.length === 0) {
        // Všechny prsty zvednuty
        console.log('Všechny prsty zvednuty, resetuji stavy');
        isTouchRotating = false;
        isPinching = false;
        isPanning = false;
        renderer.domElement.style.cursor = 'grab';
        
    } else if (touches.length === 1) {
        // Jeden prst zůstal - reset na rotaci (pokud nebyl v panning módu)
        if (!isPanning) {
            isTouchRotating = true;
            isPinching = false;
            mousePosition.x = touches[0].clientX;
            mousePosition.y = touches[0].clientY;
            
            // Zapamatovat novou počáteční pozici
            initialTouchPosition.x = touches[0].clientX;
            initialTouchPosition.y = touches[0].clientY;
            touchStartTime = Date.now();
            
            renderer.domElement.style.cursor = 'grabbing';
            
            // Spustit nový long press timer
            longPressTimer = setTimeout(() => {
                if (touches.length === 1 && isTouchRotating && !isPanning) {
                    const currentTouch = touches[0];
                    if (currentTouch) {
                        const deltaX = Math.abs(currentTouch.clientX - initialTouchPosition.x);
                        const deltaY = Math.abs(currentTouch.clientY - initialTouchPosition.y);
                        
                        if (deltaX < 15 && deltaY < 15) {
                            isTouchRotating = false;
                            isPanning = true;
                            console.log('Long press detected (touch end) - switching to panning mode');
                            showTouchIndicator('panning');
                            
                            if (navigator.vibrate) {
                                navigator.vibrate([50]);
                            }
                        }
                    }
                }
            }, longPressDelay);
        }
        
    } else if (touches.length === 2) {
        // Dva prsty zůstaly - přepnutí na pinch
        isTouchRotating = false;
        isPinching = true;
        isPanning = false;
        lastTouchDistance = getTouchDistance(touches[0], touches[1]);
    }
}

/**
 * Zobrazení touch indikátoru
 */
function showTouchIndicator(touchCount) {
    if (!touchIndicator) return;
    
    let message = '';
    if (touchCount === 'panning') {
        message = '👐 Posun - dlouhý stisk';
        touchIndicator.style.background = 'rgba(0, 150, 255, 0.9)';
    } else {
        switch (touchCount) {
            case 1:
                if (manualPanMode || isPanning) {
                    message = '👐 Posun';
                    touchIndicator.style.background = 'rgba(0, 150, 255, 0.8)';
                } else {
                    message = '🔄 Rotace';
                    touchIndicator.style.background = 'rgba(0, 0, 0, 0.8)';
                }
                break;
            case 2:
                message = '� Zoom';
                touchIndicator.style.background = 'rgba(0, 100, 0, 0.8)';
                break;
            default:
                message = '👆 Dotyk aktivní';
                touchIndicator.style.background = 'rgba(0, 0, 0, 0.8)';
        }
    }
    
    touchIndicator.textContent = message;
    touchIndicator.style.display = 'block';
    touchIndicator.style.opacity = '1';
}

/**
 * Skrytí touch indikátoru
 */
function hideTouchIndicator() {
    if (!touchIndicator) return;
    
    touchIndicator.style.opacity = '0';
    setTimeout(() => {
        if (touchIndicator) {
            touchIndicator.style.display = 'none';
        }
    }, 300);
}

/**
 * Přepínání režimu posunu pomocí tlačítka
 */
function togglePanMode() {
    manualPanMode = !manualPanMode;
    
    if (panModeToggle) {
        if (manualPanMode) {
            panModeToggle.classList.add('active');
            panModeToggle.textContent = '🔄 Režim rotace';
            showTouchIndicator('panning');
        } else {
            panModeToggle.classList.remove('active');
            panModeToggle.textContent = '👐 Režim posunu';
            showTouchIndicator(1);
        }
    }
    
    console.log('Manual pan mode:', manualPanMode);
}

// Pomocná funkce - vzdálenost mezi dvěma dotyky
function getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Hlavní render smyčka
 */
function animate() {
    requestAnimationFrame(animate);
    
    // Pouze render scény bez automatické rotace
    renderer.render(scene, camera);
}

// Nastavení kurzoru pro canvas
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (renderer && renderer.domElement) {
            renderer.domElement.style.cursor = 'grab';
        }
    }, 100);
});