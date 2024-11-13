mapboxgl.accessToken = 'pk.eyJ1Ijoibm90aTIwMjQiLCJhIjoiY2xzMXoxNWxsMGdnaDJqbXV5eGVpaWljYyJ9.pZCr01a06eBefNonXl4NcQ';
const map = new mapboxgl.Map({
    container: 'map',
    center: [-80.4544500, -1.0545800], 
    zoom: 12
});

let markers = [];

// Cargar puntos guardados al iniciar
loadMarkers();

map.on('click', function(e) {
    const clickedPoint = e.lngLat;

    let nearMarker = false;
    let clickedMarker = null;

    markers.forEach(marker => {
        const markerLngLat = marker.getLngLat();
        const distance = markerLngLat.distanceTo(clickedPoint);

        if (distance < 50) {
            nearMarker = true;
            clickedMarker = marker;
        }
    });

    if (nearMarker && clickedMarker) {
        const markerName = clickedMarker.getElement().dataset.name || 'Nombre del Refugio';
        const markerDescription = clickedMarker.getElement().dataset.description || 'Descripción no disponible';

        let popupContent = `<h3>${markerName}</h3><p>${markerDescription}</p>`;

        if (isAdmin) {
            popupContent += `
                <ul>
                    <li><a href="#" id="option-edit">Editar</a></li>
                    <li><a href="#" id="option-delete">Eliminar</a></li>
                </ul>
            `;
        }

        const popup = new mapboxgl.Popup({
            closeButton: false,
            offset: 25
        })
            .setLngLat(clickedMarker.getLngLat())
            .setHTML(popupContent)
            .addTo(map);

        if (isAdmin) {
            document.getElementById('option-edit').addEventListener('click', function() {
                const currentName = clickedMarker.getElement().dataset.name || 'Nombre del Refugio';
                const newName = prompt('Ingrese el nuevo nombre del refugio:', currentName);
                if (newName) {
                    clickedMarker.getElement().dataset.name = newName;
                    saveMarkers();
                }
            });

            document.getElementById('option-delete').addEventListener('click', function() {
                deleteMarker(clickedMarker);
                popup.remove();
            });
        }
    } else if (isAdmin) {
        const newMarker = new mapboxgl.Marker()
            .setLngLat(clickedPoint)
            .addTo(map);

        newMarker.getElement().dataset.name = 'Nuevo Refugio';
        newMarker.getElement().dataset.description = 'Descripción del refugio';
        markers.push(newMarker);
        saveMarkers();
    }
});

function saveMarkers() {
    const markersData = markers.map(marker => {
        return {
            lng: marker.getLngLat().lng,
            lat: marker.getLngLat().lat,
            name: marker.getElement().dataset.name || 'Nombre del Refugio',
            description: marker.getElement().dataset.description || 'Descripción no disponible'
        };
    });

    fetch('/save_markers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(markersData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Markers saved successfully');
        } else {
            console.error('Error saving markers');
        }
    })
    .catch(error => console.error('Error:', error));
}

function deleteMarker(marker) {
    const markerData = {
        lng: marker.getLngLat().lng,
        lat: marker.getLngLat().lat
    };

    // Realiza la solicitud de eliminación al servidor
    fetch('/delete_marker', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(markerData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Eliminar marcador del mapa y de la lista
            marker.remove();
            markers = markers.filter(m => m !== marker);
            saveMarkers();  // Vuelve a guardar la lista de marcadores actualizada
            console.log('Marker deleted successfully');
        } else {
            console.error('Error deleting marker:', data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

function loadMarkers() {
    fetch('/load_markers')
        .then(response => response.json())
        .then(markersData => {
            markersData.forEach(data => {
                const newMarker = new mapboxgl.Marker()
                    .setLngLat([data.lng, data.lat])
                    .addTo(map);
                newMarker.getElement().dataset.name = data.name;
                newMarker.getElement().dataset.description = data.description;
                markers.push(newMarker);
            });
        })
        .catch(error => console.error('Error loading markers:', error));
}
