// Paste your actual deployed Google Apps Script Web App URL right here
const API_URL = "https://script.google.com/macros/s/AKfycbxOoYzlvsqq9lf_CrFdQNsi1inNxBdxxOR91GbpSFaQb1QxvQiEUtRNf9YMolz49m_G/exec";

let teachersData = [];
let bootstrapModal;

document.addEventListener("DOMContentLoaded", () => {
    bootstrapModal = new bootstrap.Modal(document.getElementById('nidModal'));
    fetchLiveSheetsData();

    // Mapping Form Action and Filtering Listeners
    document.getElementById('clusterFilter').addEventListener('change', onClusterFilterChange);
    document.getElementById('schoolFilter').addEventListener('change', renderFilteredUI);
    document.getElementById('searchInput').addEventListener('input', renderFilteredUI);
    document.getElementById('nidForm').addEventListener('submit', executeFormPipeline);
});

// Stream records out of Google Sheets Database API
async function fetchLiveSheetsData() {
    toggleLoadingState(true);
    try {
        const response = await fetch(API_URL);
        teachersData = await response.json();
        
        generateClusterDropdown();
        computeDashboardMetrics();
        renderFilteredUI();
    } catch (err) {
        console.error("Transmission Interrupted: ", err);
        alert("গুগল শিট ডেটাবেজ সংযোগ ব্যর্থ হয়েছে! প্রডাকশন স্ক্রিপ্ট Web App URL পরীক্ষা করুন।");
    } finally {
        toggleLoadingState(false);
    }
}

// Map parameters calculation down to Dashboard metrics indicators
function computeDashboardMetrics() {
    const total = teachersData.length;
    const completed = teachersData.filter(t => t['NID[ইংরজিতে লিখুন]'] && t['NID[ইংরজিতে লিখুন]'].toString().trim() !== "").length;
    const pending = total - completed;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('totalCount').innerText = total;
    document.getElementById('completedCount').innerText = completed;
    document.getElementById('pendingCount').innerText = pending;
    document.getElementById('progressPercent').innerText = `${pct}%`;
    
    const pBar = document.getElementById('progressBar');
    pBar.style.width = `${pct}%`;
    pBar.setAttribute('aria-valuenow', pct);
}

// Dynamic cluster array listing mapping builder
function generateClusterDropdown() {
    const clusterSelect = document.getElementById('clusterFilter');
    const uniqueClusters = [...new Set(teachersData.map(t => t['ক্লাস্টার']).filter(Boolean))];
    
    clusterSelect.innerHTML = '<option value="">সব ক্লাস্টার (All)</option>';
    uniqueClusters.sort().forEach(cluster => {
        clusterSelect.innerHTML += `<option value="${cluster}">${cluster}</option>`;
    });
}

// Dependent secondary school listing cascade pipeline filter array handler
function onClusterFilterChange() {
    const activeCluster = document.getElementById('clusterFilter').value;
    const schoolSelect = document.getElementById('schoolFilter');
    
    if (!activeCluster) {
        schoolSelect.innerHTML = '<option value="">সব বিদ্যালয় (All)</option>';
        schoolSelect.disabled = true;
    } else {
        const matchingSchools = [...new Set(teachersData
            .filter(t => t['ক্লাস্টার'] === activeCluster)
            .map(t => t['বিদ্যালয়ের নাম']).filter(Boolean))];
        
        schoolSelect.innerHTML = '<option value="">সব বিদ্যালয় (All)</option>';
        matchingSchools.sort().forEach(school => {
            schoolSelect.innerHTML += `<option value="${school}">${school}</option>`;
        });
        schoolSelect.disabled = false;
    }
    renderFilteredUI();
}

// Core Rendering UI mapping layout builder
function renderFilteredUI() {
    const clusterTarget = document.getElementById('clusterFilter').value;
    const schoolTarget = document.getElementById('schoolFilter').value;
    const searchTarget = document.getElementById('searchInput').value.toLowerCase().trim();

    const renderArea = document.getElementById('teachersContainer');
    renderArea.innerHTML = "";

    const filteredDataset = teachersData.filter(teacher => {
        const matchesCluster = !clusterTarget || teacher['ক্লাস্টার'] === clusterTarget;
        const matchesSchool = !schoolTarget || teacher['বিদ্যালয়ের নাম'] === schoolTarget;
        
        const textSeed = `${teacher['শিক্ষকের নাম (বাংলা)']} ${teacher['ক্রম']} ${teacher['মোবাইল নম্বর']}`.toLowerCase();
        const matchesSearch = !searchTarget || textSeed.includes(searchTarget);

        return matchesCluster && matchesSchool && matchesSearch;
    });

    if (filteredDataset.length === 0) {
        renderArea.innerHTML = `<div class="col-12 text-center text-muted my-5"><h5>কোনো শিক্ষকের তথ্য মেলেনি! আবার খুঁজুন।</h5></div>`;
        return;
    }

    filteredDataset.forEach(teacher => {
        const currentNid = teacher['NID[ইংরজিতে লিখুন]'];
        const isSet = currentNid && currentNid.toString().trim() !== "";
        const stateBadge = isSet ? 'bg-success' : 'bg-warning text-dark';
        const stateText = isSet ? 'সম্পন্ন' : 'বাকি আছে';

        const card = `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 shadow-sm teacher-card p-3">
                    <span class="badge badge-status ${stateBadge}">${stateText}</span>
                    <div class="card-body d-flex flex-column p-0 pt-3">
                        <h5 class="card-title text-dark fw-bold mb-1 pe-5">${teacher['शिक्षকের নাম (বাংলা)'] || teacher['শিক্ষকের নাম (বাংলা)']}</h5>
                        <p class="text-muted small mb-2">ক্রম নং: ${teacher['ক্রম']} | <span class="text-primary fw-semibold">${teacher['পদবি']}</span></p>
                        <hr class="text-black-50 my-2">
                        <div class="small mb-1 text-secondary"><strong>ক্লাস্টার:</strong> ${teacher['ক্লাস্টার']}</div>
                        <div class="small mb-1 text-secondary"><strong>বিদ্যালয়:</strong> ${teacher['বিদ্যালয়ের নাম']}</div>
                        <div class="small mb-1 text-secondary"><strong>মোবাইল:</strong> ${teacher['মোবাইল নম্বর'] || 'N/A'}</div>
                        <div class="small mb-3 text-secondary"><strong>NID:</strong> ${isSet ? `<code class="fs-6 text-dark fw-bold bg-light px-2 py-1 rounded border">${currentNid}</code>` : '<span class="text-danger border-bottom border-danger border-opacity-20 fw-medium">সংগ্রহ করা হয়নি</span>'}</div>
                        <button class="btn btn-sm ${isSet ? 'btn-outline-secondary' : 'btn-primary'} w-100 mt-auto fw-bold py-2" onclick="launchNidModal('${teacher['ক্রম']}')">
                            <i class="fa-solid fa-pen-to-square me-1"></i> ${isSet ? 'NID সংশোধন করুন' : 'NID ইনপুট দিন'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        renderArea.innerHTML += card;
    });
}

// Hydrate Modal view data fields dynamically matching targeted identity sequence
function launchNidModal(serialId) {
    const match = teachersData.find(t => t['ক্রম'].toString().trim() === serialId.toString().trim());
    if (!match) return;

    document.getElementById('mId').value = match['ক্রম'];
    document.getElementById('mName').innerText = match['শিক্ষকের নাম (বাংলা)'];
    document.getElementById('mDesignation').innerText = match['পদবি'];
    document.getElementById('mSchool').innerText = match['বিদ্যালয়ের নাম'];
    
    const nInput = document.getElementById('nidInput');
    nInput.value = match['NID[ইংরজিতে লিখুন]'] || "";
    nInput.classList.remove('is-invalid');

    bootstrapModal.show();
}

// Form Submission & NID validation check routines (Checks: 10, 13, 17 digits numbers only)
function isValidNIDPattern(nidValue) {
    return /^\d+$/.test(nidValue) && (nidValue.length === 10 || nidValue.length === 13 || nidValue.length === 17);
}

async function executeFormPipeline(e) {
    e.preventDefault();
    
    const targetId = document.getElementById('mId').value;
    const inputVal = document.getElementById('nidInput').value.trim();
    const inputField = document.getElementById('nidInput');

    if (!isValidNIDPattern(inputVal)) {
        inputField.classList.add('is-invalid');
        return;
    }
    inputField.classList.remove('is-invalid');

    setModalButtonSpinner(true);

    try {
        const payload = { teacherId: targetId, nid: inputVal };

        // Executes write pipeline immediately into Sheets using no-cors transmission layer rules
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Mutates current runtime cache immediately to update data visually without lagging reload screens
        const targetIndex = teachersData.findIndex(t => t['ক্রম'].toString().trim() === targetId.toString().trim());
        if (targetIndex !== -1) {
            teachersData[targetIndex]['NID[ইংরজিতে লিখুন]'] = inputVal;
        }

        bootstrapModal.hide();
        computeDashboardMetrics();
        renderFilteredUI();

    } catch (err) {
        console.error(err);
        alert("সার্ভার ক্লাউড স্প্রেডশিটে ডাটা পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
        setModalButtonSpinner(false);
    }
}

function toggleLoadingState(showSpinner) {
    const loader = document.getElementById('loading');
    const mainGrid = document.getElementById('teachersContainer');
    if (showSpinner) {
        loader.classList.remove('d-none');
        mainGrid.classList.add('d-none');
    } else {
        loader.classList.add('d-none');
        mainGrid.classList.remove('d-none');
    }
}

function setModalButtonSpinner(isProcessing) {
    const bTxt = document.getElementById('btnText');
    const bSpin = document.getElementById('btnSpinner');
    const submitBtn = document.getElementById('saveBtn');

    if (isProcessing) {
        bTxt.innerText = "গুগল ড্রাইভে সংরক্ষিত হচ্ছে... ";
        bSpin.classList.remove('d-none');
        submitBtn.disabled = true;
    } else {
        bTxt.innerText = "সার্ভার গুগল শিটে সেভ করুন";
        bSpin.classList.add('d-none');
        submitBtn.disabled = false;
    }
}
