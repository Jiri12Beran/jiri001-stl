// Hubice geometrie - přímo jako Three.js vertex data
const HUBICE_VERTICES = new Float32Array([
    // Trojúhelník 1
    -5.25, -7.8, -8.0,
    -5.25, -8.4, -8.0,
    -5.679, -8.7, -8.0,
    
    // Trojúhelník 2
    -5.25, -7.8, -8.0,
    -5.679, -8.7, -8.0,
    -5.679, -8.1, -8.0,
    
    // Trojúhelník 3
    -5.679, -8.1, -8.0,
    -5.679, -8.7, -8.0,
    -6.3, -8.7, -8.0,
    
    // Trojúhelník 4
    -5.679, -8.1, -8.0,
    -6.3, -8.7, -8.0,
    -6.3, -8.1, -8.0,
    
    // Dodatečné trojúhelníky pro lepší tvar
    -6.3, -8.1, -8.0,
    -6.3, -8.7, -8.0,
    -7.0, -8.4, -8.0,
    
    -6.3, -8.1, -8.0,
    -7.0, -8.4, -8.0,
    -6.8, -7.5, -8.0
]);

function createEmbeddedHubiceFromSTL() {
    console.log('Creating embedded hubice from vertex data...');
    try {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(HUBICE_VERTICES, 3));
        geometry.computeVertexNormals();
        
        console.log('Created geometry with', HUBICE_VERTICES.length / 3, 'vertices');
        console.log('Geometry:', geometry);
        
        return geometry;
    } catch (error) {
        console.error('Failed to create embedded hubice geometry:', error);
        return null;
    }
}