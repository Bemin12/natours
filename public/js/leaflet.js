/* eslint-disable */
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
      maxZoom: 19, // Maximum zoom level
    },
  ).addTo(map);

  const bounds = L.latLngBounds(); // Create a LatLngBounds object to track the bounds of the map

  locations.forEach((loc) => {
    const customMarker = L.divIcon({
      className: 'marker', // Custom CSS class for the marker
      iconSize: [32, 40], // Size of the icon
      iconAnchor: [16, 40], // Anchor point of the icon
      popupAnchor: [0, -15], // Anchor point of the popup relative to the icon
    });

    // Add marker
    L.marker([loc.coordinates[1], loc.coordinates[0]], {
      icon: customMarker, // Use the custom marker icon
    })
      .addTo(map) // Add the marker to the map
      .bindPopup(`<p>Day ${loc.day}: ${loc.description}</p>`, {
        autoClose: false, // Do not auto-close the popup
        closeOnClick: false, // Do not close the popup when clicking on the map
        className: 'leaflet-popup', // Custom CSS class for the popup
      })
      .openPopup(); // Open the popup

    bounds.extend([loc.coordinates[1], loc.coordinates[0]]); // Extend the bounds to include the current location
  });

  map.fitBounds(bounds, {
    padding: [200, 200], // Add padding around the bounds
  });
};
