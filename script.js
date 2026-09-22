// ============================================================
// SU-MARG NAGPUR
// Smart Urban Monitoring & Grievance Grid
// ============================================================

let map;
let markersLayer;
let appState = null;


// ============================================================
// INITIALIZE APPLICATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  initMap();
  fetchState();

  setInterval(updateClock, 1000);
  updateClock();
});


// ============================================================
// LIVE CLOCK
// ============================================================

function updateClock() {
  const clock = document.getElementById('liveClock');

  if (!clock) return;

  const now = new Date();

  clock.innerText =
    now.toLocaleTimeString('en-IN', {
      hour12: false
    }) + ' IST';
}


// ============================================================
// ROLE SWITCHER
// ============================================================

function switchRole(role) {

  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.className =
      'role-tab px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-slate-400 hover:text-white';
  });

  const activeTab =
    document.getElementById(`tab-${role}`);

  if (activeTab) {
    activeTab.className =
      'role-tab px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 bg-blue-600 text-white shadow-sm font-semibold';
  }

  document.getElementById('view-admin')?.classList.add('hidden');
  document.getElementById('view-engineer')?.classList.add('hidden');
  document.getElementById('view-citizen')?.classList.add('hidden');
  document.getElementById('view-contractor')?.classList.add('hidden');

  const target =
    document.getElementById(`view-${role}`);

  if (target) {
    target.classList.remove('hidden');
  }

  if (role === 'admin' && map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }

  lucide.createIcons();
}


// ============================================================
// INITIALIZE LEAFLET MAP
// ============================================================

function initMap() {

  map = L.map('nagpurMap', {
    zoomControl: true,
    attributionControl: false
  }).setView(
    [21.1458, 79.0882],
    12
  );

  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    {
      maxZoom: 19
    }
  ).addTo(map);

  markersLayer =
    L.layerGroup().addTo(map);


  // Dig-Lock Construction Conflict Corridor

  const conflictLine = L.polyline(
    [
      [21.0965, 79.0770],
      [21.0988, 79.0815]
    ],
    {
      color: '#f59e0b',
      weight: 8,
      opacity: 0.85,
      dashArray: '8, 8'
    }
  ).addTo(map);


  conflictLine.bindPopup(`
    <div class="text-xs p-1">
      <strong class="text-amber-600">
        ⚠️ DIG-LOCK CONFLICT CORRIDOR
      </strong>
      <br/>

      <strong>Location:</strong>
      Manish Nagar Railway Crossing Road
      <br/>

      <strong>PWD Resurfacing:</strong>
      Planned Oct 2026
      <br/>

      <strong>OCW Water Pipeline:</strong>
      Planned Nov 2026
      <br/>

      <span style="color:red;font-weight:bold;">
        Excavation Permit Frozen!
      </span>
    </div>
  `);
}


// ============================================================
// FETCH BACKEND STATE
// ============================================================

async function fetchState() {

  try {

    const res =
      await fetch('/api/state');

    if (!res.ok) {
      throw new Error('Unable to fetch state');
    }

    appState =
      await res.json();

    renderUI();

  } catch (err) {

    console.error(
      'Failed to fetch state:',
      err
    );
  }
}


// ============================================================
// RENDER UI
// ============================================================

function renderUI() {

  if (!appState) return;


  // ----------------------------------------------------------
  // KPI COUNTERS
  // ----------------------------------------------------------

  document.getElementById('kpi-open').innerText =
    appState.metrics.open_complaints;

  document.getElementById('kpi-critical').innerText =
    appState.metrics.critical_complaints;

  document.getElementById('kpi-merged').innerText =
    appState.metrics.duplicates_merged;

  document.getElementById('kpi-conflicts').innerText =
    appState.metrics.conflicts_prevented;


  // ----------------------------------------------------------
  // MAP MARKERS
  // ----------------------------------------------------------

  markersLayer.clearLayers();

  const issuesList =
    document.getElementById('issuesList');

  issuesList.innerHTML = '';


  const engineerCards =
    document.getElementById('engineerCards');

  if (engineerCards) {
    engineerCards.innerHTML = '';
  }


  appState.issues.forEach(issue => {

    let markerColor = '#3b82f6';

    if (issue.priority === 'CRITICAL') {
      markerColor = '#ef4444';
    }

    else if (issue.priority === 'HIGH') {
      markerColor = '#f59e0b';
    }

    else if (issue.status === 'RESOLVED') {
      markerColor = '#10b981';
    }


    const customMarker =
      L.circleMarker(
        [issue.lat, issue.lng],
        {
          radius:
            issue.priority === 'CRITICAL'
              ? 12
              : 9,

          fillColor: markerColor,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }
      );


    // --------------------------------------------------------
    // MAP POPUP
    // --------------------------------------------------------

    const popupHtml = `
      <div
        class="text-xs space-y-1 p-1"
        style="min-width:220px;"
      >

        <div class="flex items-center justify-between">
          <strong style="color:${markerColor}">
            ${issue.id}
          </strong>

          <span
            class="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded"
          >
            ${issue.status}
          </span>
        </div>

        <div class="font-bold text-slate-800">
          ${issue.address}
        </div>

        <div class="text-slate-600">
          <strong>Ward:</strong>
          ${issue.ward}
        </div>

        <div class="text-slate-600">
          <strong>Dept:</strong>
          ${issue.department}
        </div>

        <div class="text-slate-600">
          <strong>Reports Merged:</strong>

          <span
            class="font-bold text-purple-700"
          >
            ${issue.report_count}
          </span>
        </div>

        <div class="text-slate-600">
          <strong>AI Severity:</strong>
          ${issue.ai_severity}
        </div>

        <div
          class="mt-2 p-1 bg-slate-100 rounded text-[11px] text-slate-700"
        >
          ${issue.priority_explanation}
        </div>

      </div>
    `;


    customMarker.bindPopup(
      popupHtml
    );

    markersLayer.addLayer(
      customMarker
    );


    // --------------------------------------------------------
    // PRIORITY QUEUE
    // --------------------------------------------------------

    const isCritical =
      issue.priority === 'CRITICAL';


    const card =
      document.createElement('div');


    card.className =
      `p-3 rounded-xl border transition-all cursor-pointer ${
        isCritical
          ? 'bg-rose-950/20 border-rose-800/60 hover:bg-rose-950/30'
          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
      }`;


    card.onclick = () => {

      map.flyTo(
        [issue.lat, issue.lng],
        15
      );

      customMarker.openPopup();
    };


    card.innerHTML = `
      <div
        class="flex items-center justify-between text-xs mb-1"
      >

        <span
          class="font-mono font-bold ${
            isCritical
              ? 'text-rose-400'
              : 'text-amber-400'
          }"
        >
          ${issue.id}
        </span>

        <div class="flex items-center gap-1.5">

          <span
            class="text-[10px] px-2 py-0.5 rounded-full font-bold ${
              isCritical
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }"
          >
            ${issue.priority}
            (${issue.priority_score})
          </span>

          <span
            class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold"
          >
            ${issue.report_count}x
          </span>

        </div>
      </div>

      <div
        class="text-xs font-semibold text-white truncate"
      >
        ${issue.address}
      </div>

      <p
        class="text-[11px] text-slate-400 mt-1 leading-tight"
      >
        ${issue.priority_explanation}
      </p>
    `;


    issuesList.appendChild(card);


    // --------------------------------------------------------
    // ENGINEER CARDS
    // --------------------------------------------------------

    if (engineerCards) {

      const engCard =
        document.createElement('div');

      engCard.className =
        'bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3';


      engCard.innerHTML = `
        <div class="flex justify-between items-start">

          <div>

            <span
              class="text-xs font-mono font-bold text-blue-400"
            >
              ${issue.id}
            </span>

            <h4
              class="text-sm font-bold text-white mt-0.5"
            >
              ${issue.address}
            </h4>

            <span
              class="text-xs text-slate-400"
            >
              ${issue.ward}
              •
              ${issue.department}
            </span>

          </div>

          <span
            class="text-xs px-2 py-0.5 rounded font-bold ${
              isCritical
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-slate-800 text-slate-300'
            }"
          >
            ${issue.status}
          </span>

        </div>

        <div
          class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
        >
          <strong class="text-amber-400">
            Explainable Priority Rationale:
          </strong>

          <br/>

          ${issue.priority_explanation}
        </div>

        <div
          class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs"
        >

          <span class="text-slate-400">
            Contractor:
            <strong class="text-white">
              ${issue.contractor}
            </strong>
          </span>

          <button
            onclick="map.flyTo([${issue.lat}, ${issue.lng}], 15); switchRole('admin');"
            class="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition"
          >
            Locate On Map
          </button>

        </div>
      `;

      engineerCards.appendChild(
        engCard
      );
    }

  });


  // ==========================================================
  // DIG-LOCK TABLE
  // ==========================================================

  const confTable =
    document.getElementById('conflictsTable');

  confTable.innerHTML = '';


  appState.conflicts.forEach(conf => {

    const tr =
      document.createElement('tr');

    tr.className =
      'hover:bg-slate-800/40 transition';


    tr.innerHTML = `
      <td
        class="py-2.5 px-3 font-semibold text-white"
      >
        ${conf.location}
      </td>

      <td class="py-2.5 px-3">
        <span class="text-sky-400 font-medium">
          ${conf.agency1}
        </span>
        <br/>

        <span class="text-[11px] text-slate-400">
          ${conf.project1}
        </span>
      </td>

      <td class="py-2.5 px-3">
        <span class="text-amber-400 font-medium">
          ${conf.agency2}
        </span>
        <br/>

        <span class="text-[11px] text-slate-400">
          ${conf.project2}
        </span>
      </td>

      <td
        class="py-2.5 px-3 font-mono text-[11px] text-slate-300"
      >
        ${conf.start1}
        to
        ${conf.end2}
      </td>

      <td
        class="py-2.5 px-3 font-bold text-emerald-400"
      >
        ${conf.savings_estimate}
      </td>

      <td class="py-2.5 px-3">

        <span
          class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
        >
          🔒 PERMIT LOCKED
        </span>

      </td>
    `;

    confTable.appendChild(tr);
  });


  lucide.createIcons();
}


// ============================================================
// DEMO SCENARIOS
// ============================================================

async function triggerDemo(scenario) {

  try {

    const endpoint =
      `/api/demo/${scenario}`;

    const res =
      await fetch(
        endpoint,
        {
          method: 'POST'
        }
      );

    const result =
      await res.json();


    await fetchState();


    if (scenario === 'laxmi-nagar-flood') {

      showToast(
        '⚡ Demo 1: Laxmi Nagar Flood',
        result.message,
        'git-merge',
        'purple'
      );

      map.flyTo(
        [21.1215, 79.0682],
        15
      );
    }


    else if (scenario === 'school-crater') {

      showToast(
        '⚡ Demo 2: School Gate Safety Jump',
        result.message,
        'alert-octagon',
        'rose'
      );

      map.flyTo(
        [21.1442, 79.0621],
        15
      );
    }


    else if (scenario === 'dig-lock-clash') {

      showToast(
        '⚡ Demo 3: Dig-Lock Trench Clash',
        result.message,
        'shield-alert',
        'amber'
      );

      map.flyTo(
        [21.0978, 79.0792],
        15
      );
    }


    else if (scenario === 'repair-verify') {

      showToast(
        '⚡ Demo 4: 3-Stage Repair Submitted',
        result.message,
        'check-circle',
        'emerald'
      );

      map.flyTo(
        [21.1215, 79.0682],
        15
      );
    }


    else if (scenario === 'reset') {

      showToast(
        'Demo Reset',
        'All data returned to initial hackathon baseline.',
        'rotate-ccw',
        'blue'
      );

      map.flyTo(
        [21.1458, 79.0882],
        12
      );
    }

  } catch (err) {

    console.error(
      'Demo failed:',
      err
    );

    showToast(
      'Demo Error',
      'Unable to connect to the backend.',
      'alert-triangle',
      'rose'
    );
  }
}


// ============================================================
// CITIZEN CAMERA SIMULATION
// ============================================================

function simulateCameraSnap() {

  showToast(
    'AI Vision Snapshot',
    'YOLOv8 & OpenCV executed in 118ms: Detected severe pothole contour (>8cm depth, 0.85m² area).',
    'camera',
    'sky'
  );
}


// ============================================================
// SUBMIT CITIZEN COMPLAINT
// ============================================================

async function submitCitizenComplaint() {

  const cat =
    document.getElementById(
      'citizenCategory'
    ).value;

  const addr =
    document.getElementById(
      'citizenAddress'
    ).value;

  const desc =
    document.getElementById(
      'citizenDesc'
    ).value;


  try {

    const res =
      await fetch(
        '/api/complaints/submit',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            category: cat,
            address: addr,
            description: desc,
            lat: 21.1442,
            lng: 79.0621
          })
        }
      );


    const data =
      await res.json();


    showToast(
      'Complaint Registered',
      `${data.tracking_code}: ${data.message}`,
      'check',
      'emerald'
    );


    await fetchState();

    switchRole('admin');


    map.flyTo(
      [21.1442, 79.0621],
      15
    );

  } catch (e) {

    console.error(e);

    alert(
      'Error submitting complaint'
    );
  }
}


// ============================================================
// CITIZEN VOTE
// ============================================================

async function castCitizenVote(verdict) {

  try {

    const res =
      await fetch(
        '/api/citizen/vote',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            verdict: verdict
          })
        }
      );


    const data =
      await res.json();


    showToast(
      'Citizen Feedback Recorded',
      data.message,
      'thumbs-up',
      'emerald'
    );


    await fetchState();

  } catch (e) {

    console.error(e);
  }
}


// ============================================================
// TOAST SYSTEM
// ============================================================

function showToast(
  title,
  msg,
  iconName,
  color
) {

  const toast =
    document.getElementById(
      'toast'
    );

  document.getElementById(
    'toastTitle'
  ).innerText = title;

  document.getElementById(
    'toastMsg'
  ).innerText = msg;


  const iconContainer =
    document.getElementById(
      'toastIcon'
    );


  iconContainer.className =
    `p-2 rounded-xl bg-${color}-500/20 text-${color}-400 flex-shrink-0`;


  iconContainer.innerHTML =
    `<i data-lucide="${iconName}" class="w-5 h-5"></i>`;


  lucide.createIcons();


  toast.classList.remove(
    'translate-y-24',
    'opacity-0'
  );


  setTimeout(
    hideToast,
    6500
  );
}


// ============================================================
// HIDE TOAST
// ============================================================

function hideToast() {

  const toast =
    document.getElementById(
      'toast'
    );

  toast.classList.add(
    'translate-y-24',
    'opacity-0'
  );
}
