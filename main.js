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

// UI elementy - budou načteny až po načtení DOM
let fileInput, statusElement, canvasContainer;
let wireframeToggle;
let colorPicker;
let lightingSlider;
let lightingValue;
let currentLightingIntensity = 1.0;

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
    lightingSlider = document.getElementById('lightingSlider');
    lightingValue = document.getElementById('lightingValue');
    colorPicker = document.getElementById('colorPicker');
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
    
    touches = Array.from(event.touches);
    
    if (touches.length === 1) {
        // Jeden prst - rotace
        isTouchRotating = true;
        isPinching = false;
        mousePosition.x = touches[0].clientX;
        mousePosition.y = touches[0].clientY;
    } else if (touches.length === 2) {
        // Dva prsty - zoom (pinch)
        isTouchRotating = false;
        isPinching = true;
        lastTouchDistance = getTouchDistance(touches[0], touches[1]);
    }
}

// Touch move - pohyb během dotyku
function onTouchMove(event) {
    event.preventDefault();
    
    touches = Array.from(event.touches);
    
    if (isTouchRotating && touches.length === 1) {
        // Rotace jedním prstem
        const deltaX = touches[0].clientX - mousePosition.x;
        const deltaY = touches[0].clientY - mousePosition.y;
        
        // Stejná logika jako u myši
        cameraPosition.phi -= deltaX * 0.01;
        cameraPosition.theta = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPosition.theta + deltaY * 0.01));
        
        updateCameraPosition();
        
        mousePosition.x = touches[0].clientX;
        mousePosition.y = touches[0].clientY;
        
    } else if (isPinching && touches.length === 2) {
        // Zoom pomocí pinch gestur
        const currentDistance = getTouchDistance(touches[0], touches[1]);
        const deltaDistance = currentDistance - lastTouchDistance;
        
        // Zoom na základě změny vzdálenosti prstů
        const zoomFactor = deltaDistance * 0.01;
        cameraPosition.radius = Math.max(1, Math.min(20, cameraPosition.radius - zoomFactor));
        
        updateCameraPosition();
        lastTouchDistance = currentDistance;
    }
}

// Touch end - konec dotyku
function onTouchEnd(event) {
    event.preventDefault();
    
    touches = Array.from(event.touches);
    
    if (touches.length === 0) {
        // Všechny prsty zvednuty
        isTouchRotating = false;
        isPinching = false;
    } else if (touches.length === 1) {
        // Jeden prst zůstal - přepnutí na rotaci
        isTouchRotating = true;
        isPinching = false;
        mousePosition.x = touches[0].clientX;
        mousePosition.y = touches[0].clientY;
    }
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