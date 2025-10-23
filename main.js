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

// UI elementy
const fileInput = document.getElementById('fileInput');
const statusElement = document.getElementById('status');
const canvasContainer = document.getElementById('canvas-container');
let wireframeToggle;

// Inicializace aplikace po načtení stránky
document.addEventListener('DOMContentLoaded', function() {
    checkWebGLSupport();
    initScene();
    setupEventListeners();
    updateStatus('ready', 'Ready - Vyberte STL soubor');
});

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
        // Vytvoření scény
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2a2a2a);

        // Nastavení kamery (perspektivní s FOV ~60°)
        const aspect = window.innerWidth / window.innerHeight;
        camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        updateCameraPosition();

        // Vytvoření rendereru s antialiasem
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Přidání canvas do kontejneru
        canvasContainer.appendChild(renderer.domElement);

        // Přidání světel
        setupLighting();

        // Spuštění render smyčky
        animate();

    } catch (error) {
        updateStatus('error', 'Chyba při inicializaci 3D scény: ' + error.message);
        console.error('Scene initialization failed:', error);
    }
}

/**
 * Nastavení osvětlení scény
 */
function setupLighting() {
    // Ambient světlo pro základní osvětlení
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Hlavní směrové světlo
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Druhé směrové světlo pro vyplnění stínů
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, -5, -5);
    scene.add(fillLight);
}

/**
 * Nastavení event listenerů pro UI a ovládání
 */
function setupEventListeners() {
    // Inicializace wireframe tlačítka
    wireframeToggle = document.getElementById('wireframeToggle');
    
    // File input pro načítání STL souborů
    fileInput.addEventListener('change', handleFileSelect);

    // Wireframe toggle tlačítko
    if (wireframeToggle) {
        wireframeToggle.addEventListener('click', toggleWireframe);
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
}

/**
 * Zpracování výběru souboru
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

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
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            const arrayBuffer = event.target.result;
            
            // Vytvoření jednoduchého STL loaderu
            const loader = new THREE.STLLoader();
            
            // Parsování STL dat
            const geometry = loader.parse(arrayBuffer);
            
            if (!geometry || geometry.attributes.position.count === 0) {
                throw new Error('STL soubor neobsahuje žádná platná data');
            }

            // Zobrazení modelu ve scéně
            displayModel(geometry);
            updateStatus('ready', `Načteno: ${file.name} (${geometry.attributes.position.count / 3} trojúhelníků)`);

        } catch (error) {
            updateStatus('error', 'Chyba při načítání STL: ' + error.message);
            console.error('STL loading failed:', error);
        }
    };

    reader.onerror = function() {
        updateStatus('error', 'Chyba při čtení souboru');
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Zobrazení 3D modelu ve scéně
 */
function displayModel(geometry) {
    // Odstranění předchozího modelu
    if (currentModel) {
        scene.remove(currentModel);
        currentModel.geometry.dispose();
        currentModel.material.dispose();
    }

    // Výpočet normál pro správné osvětlení
    geometry.computeVertexNormals();

    // Vytvoření materiálu
    const material = new THREE.MeshLambertMaterial({
        color: 0x00ff88,
        side: THREE.DoubleSide
    });

    // Vytvoření mesh objektu
    currentModel = new THREE.Mesh(geometry, material);
    currentModel.castShadow = true;
    currentModel.receiveShadow = true;

    // Přidání do scény
    scene.add(currentModel);

    // Reset wireframe stavu při načtení nového modelu
    isWireframe = false;
    if (wireframeToggle) {
        wireframeToggle.classList.remove('active');
        wireframeToggle.textContent = '📐 Drátový model';
    }

    // Vycentrování a přizpůsobení kamery
    centerAndFitModel();
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
    statusElement.className = type;
    statusElement.textContent = message;
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