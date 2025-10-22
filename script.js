// script.js - Interactive Map using Leaflet
// Loads data/locations.json, places markers, implements search and filter, geolocation.

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  // 1. Initialize map
  const map = L.map('map', {scrollWheelZoom:true}).setView([40.7831, -73.9712], 12);

  // 2. Tile layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // 3. Load locations JSON
  const resp = await fetch('data/locations.json');
  const locations = await resp.json();

  // containers
  const markers = [];
  const markerGroup = L.layerGroup().addTo(map);
  const categorySet = new Set();

  // Helper: create popup HTML
  function createPopupHTML(loc){
    return `
      <div class="popup">
        <h3>${escapeHtml(loc.name)}</h3>
        <small>${escapeHtml(loc.category)}</small>
        <p>${escapeHtml(loc.description)}</p>
        ${loc.image ? `<img src="${loc.image}" alt="${escapeHtml(loc.name)}">` : ''}
        <p><a href="https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}" target="_blank" rel="noopener">Open in Google Maps</a></p>
      </div>
    `;
  }

  // Escape to avoid injection
  function escapeHtml(str){ return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

  // Add markers
  locations.forEach(loc => {
    categorySet.add(loc.category);
    const marker = L.marker([loc.lat, loc.lng], {title:loc.name});
    marker.bindPopup(createPopupHTML(loc), {minWidth:180});
    marker.on('click', ()=> {
      // small bounce animation: move marker up then down (works by setting iconAnchor temporarily)
      const el = marker.getElement?.();
      if(el){
        el.classList.add('bounce');
        setTimeout(()=> el.classList.remove('bounce'), 600);
      }
    });
    markerGroup.addLayer(marker);
    markers.push({loc, marker});
  });

  // Fit map to markers
  if(markers.length){
    const group = L.featureGroup(markers.map(m=>m.marker));
    map.fitBounds(group.getBounds().pad(0.12));
  }

  // Populate category filter
  const categoryFilter = document.getElementById('categoryFilter');
  Array.from(categorySet).sort().forEach(cat=>{
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  // Populate sidebar list
  const locationList = document.getElementById('locationList');
  function renderList(items){
    locationList.innerHTML = '';
    items.forEach(({loc, marker})=>{
      const li = document.createElement('li');
      li.className = 'location-item';
      li.innerHTML = `
        <img class="location-thumb" src="${loc.image}" alt="${escapeHtml(loc.name)}" />
        <div>
          <div class="location-title">${escapeHtml(loc.name)}</div>
          <div class="location-cat">${escapeHtml(loc.category)}</div>
        </div>
      `;
      li.addEventListener('click', ()=> {
        marker.openPopup();
        map.setView(marker.getLatLng(), 15, {animate:true});
      });
      locationList.appendChild(li);
    });
  }
  renderList(markers);

  // Search & filter
  const searchInput = document.getElementById('searchInput');
  function applyFilters(){
    const q = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    const filtered = markers.filter(({loc}) => {
      const matchesQ = !q || (loc.name+ ' ' + loc.category + ' ' + loc.description).toLowerCase().includes(q);
      const matchesCat = !cat || loc.category === cat;
      return matchesQ && matchesCat;
    });
    // update map markers
    markerGroup.clearLayers();
    filtered.forEach(({marker}) => markerGroup.addLayer(marker));
    // update list
    renderList(filtered);
    // adjust map viewport if possible
    if(filtered.length){
      const fg = L.featureGroup(filtered.map(m=>m.marker));
      map.fitBounds(fg.getBounds().pad(0.12));
    }
  }

  searchInput.addEventListener('input', applyFilters);
  categoryFilter.addEventListener('change', applyFilters);

  // Geolocation: center map on user
  const locateBtn = document.getElementById('locateBtn');
  locateBtn.addEventListener('click', ()=> {
    if(!navigator.geolocation){
      alert('Geolocation not supported by this browser.');
      return;
    }
    locateBtn.disabled = true;
    locateBtn.textContent = 'Locating...';
    navigator.geolocation.getCurrentPosition(pos => {
      const {latitude, longitude} = pos.coords;
      map.setView([latitude, longitude], 14, {animate:true});
      // add a temporary marker
      const userMarker = L.circleMarker([latitude, longitude], {radius:8, color:'#2b7cff', fillColor:'#2b7cff', fillOpacity:0.8}).addTo(map);
      setTimeout(()=> { map.removeLayer(userMarker); locateBtn.disabled=false; locateBtn.textContent='📍 My location'; }, 6000);
    }, err => {
      alert('Could not get location: ' + err.message);
      locateBtn.disabled=false;
      locateBtn.textContent='📍 My location';
    }, {enableHighAccuracy:true, timeout:10000});
  });

  // Keyboard accessibility: focus search input with '/'
  window.addEventListener('keydown', (e)=>{
    if(e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){
      e.preventDefault(); searchInput.focus();
    }
  });

  // Optional: small CSS animation injection for bounce
  const style = document.createElement('style');
  style.innerHTML = `
    .leaflet-marker-icon.bounce { transform-origin: center bottom; animation: bounce 0.6s; }
    @keyframes bounce { 0%{ transform: translateY(0) } 30%{ transform: translateY(-12px)} 60%{ transform: translateY(0)} 100%{ transform: translateY(0)} }
  `;
  document.head.appendChild(style);

});
