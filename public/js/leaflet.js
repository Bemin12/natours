import L from 'leaflet';

// If needed, include the Leaflet CSS
import 'leaflet/dist/leaflet.css';

export const displayMap = (locations) => {
  // Initialize the map and set the view to the specified coordinates
  const map = L.map('map', {
    center: [locations[0].coordinates[1], locations[0].coordinates[0]], // Center the map
    zoom: 6.5, // Set the zoom level
    scrollWheelZoom: false, // Disable scroll zoom
  });

  // Add a gray tile layer to the map (CartoDB Positron)
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    },
  ).addTo(map);

  const bounds = L.latLngBounds();

  locations.forEach((loc) => {
    const customMarker = L.divIcon({
      className: 'marker',
      iconSize: [32, 40],
      popupAnchor: [0, -1],
    });

    // Add marker
    L.marker([loc.coordinates[1], loc.coordinates[0]], {
      icon: customMarker,
    })
      .addTo(map)
      .bindPopup(`<p>Day ${loc.day}: ${loc.description}</p>`, {
        autoClose: false,
        closeOnClick: false,
        className: 'leaflet-popup',
      })
      .openPopup();

    bounds.extend([loc.coordinates[1], loc.coordinates[0]]);
  });

  map.fitBounds(bounds, {
    padding: [200, 200],
  });
};
