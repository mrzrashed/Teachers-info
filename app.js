// আপনার গুগল অ্যাপস স্ক্রিপ্ট এর আসল Web App URL এখানে দিন
const API_URL = "";https://script.google.com/macros/s/AKfycbz6R634B_sSNIpHxKfRt2OFKmA_xogjK1Z6eiHcSTzbKYvZhIXhscgGKSismZdEmDHW/exec

let teachersData = [];
let bootstrapModal;
let selectedCluster = "";
let selectedSchool = "";
let searchTimeout; 

document.addEventListener("DOMContentLoaded", () => {
    bootstrapModal = new bootstrap.Modal(document.getElementById('nidModal'));
    fetchLiveSheetsData();

    document.getElementById('clusterFilter').addEventListener('change', onClusterSelectionChange);
    // ২৫০ms থেকে কমিয়ে ২০০ms করা হয়েছে যেন আরও দ্রুত রেসপন্স করে
    document.getElementById('searchInput').addEventListener('input', debounceSearch);
    document.getElementById('nidForm').addEventListener('submit', executeFormPipeline);
});

async function fetchLiveSheetsData() {
    toggleLoadingState(true);
    try {
        const response = await fetch(API_URL);
        teachersData = await response.json();
        
        generateClusterDropdown();
        computeDashboardMetrics();
    } catch (err) {
        console.error(err);
        alert("গুগল শিট ডেটাবেজ সংযোগ ব্যর্থ হয়েছে!");
    } finally {
        toggleLoadingState(false);
    }
}

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

function generateClusterDropdown() {
    const clusterSelect = document.getElementById('clusterFilter');
    const uniqueClusters = [...new Set(teachersData.map(t => t['ক্লাস্টার']).filter(Boolean))];
    
    clusterSelect.innerHTML = '<option value="">-- ক্লাস্টার সিলেক্ট করুন --</option>';
    uniqueClusters.sort().forEach(cluster => {
        clusterSelect.innerHTML += `<option value="${cluster}">${cluster}</option>`;
    });
}

function onClusterSelectionChange() {
    selectedCluster = document.getElementById('clusterFilter').value;
    selectedSchool = ""; 
    document.getElementById('searchInput').value = ""; 

    const schoolPanel = document.getElementById('schoolPanelSection');
    const teachersPanel = document.getElementById('teachersPanelSection');
    const welcomeMsg = document.getElementById('welcomeMessage');
    const cardArea = document.getElementById('teachersContainer');
    const schoolListContainer = document.getElementById('schoolListGroup');

    cardArea.classList.add('d-none');

    if (!selectedCluster) {
        schoolPanel.classList.add('d-none');
        teachersPanel.className = "col-lg-12";
        welcomeMsg.classList.remove('d-none');
        return;
    }

    const schools = [...new Set(teachersData
        .filter(t => t['ক্লাস্টার'] === selectedCluster)
        .map(t => t['বিদ্যালয়ের নাম']).filter(Boolean))].sort();

    document.getElementById('schoolCount').innerText = schools.length;

    welcomeMsg.classList.add('d-none');
    schoolPanel.classList.remove('d-none');
    teachersPanel.className = "col-lg-8";

    // এখানেও স্পিড বাড়ানোর জন্য সিঙ্গেল স্ট্রিং ব্যবহার করা হয়েছে
    let schoolsHtml = "";
    schools.forEach((school) => {
        schoolsHtml += `
            <button class="btn school-btn btn-light shadow-sm p-2 text-start rounded text-truncate" data-school="${school}" onclick="onSchoolButtonClick(this)">
                <i class="fa-solid fa-school text-muted me-2 small"></i>${school}
            </button>
        `;
    });
    schoolListContainer.innerHTML = schoolsHtml;
}

function onSchoolButtonClick(buttonElement) {
    document.querySelectorAll('.school-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');

    selectedSchool = buttonElement.getAttribute('data-school');
    renderTargetTeachers();
}

// সুপার অপ্টিমাইজড রেন্ডারিং ইঞ্জিন (High-Speed HTML Generation)
function renderTargetTeachers(customDataset = null) {
    const cardArea = document.getElementById('teachersContainer');
    
    // পুরানো কার্ডগুলো এক ঝটকায় মেমোরি থেকে মুছে ফেলা (গতির জন্য গুরুত্বপূর্ণ)
    cardArea.textContent = ''; 
    cardArea.classList.remove('d-none');

    let filteredList = customDataset;
    if (!filteredList) {
        filteredList = teachersData.filter(t => t['ক্লাস্টার'] === selectedCluster && t['বিদ্যালয়ের নাম'] === selectedSchool);
    }

    if (filteredList.length === 0) {
        cardArea.innerHTML = `<div class="col-12 text-center text-muted my-4"><h5>কোনো শিক্ষকের তথ্য পাওয়া যায়নি!</h5></div>`;
        return;
    }

    // একটি মাত্র অ্যারেতে পুরো HTML পুশ করে শেষে একবার মাত্র DOM-এ রাইট করা হবে
    const htmlBuffer = [];
    const len = filteredList.length;

    for (let i = 0; i < len; i++) {
        const teacher = filteredList[i];
        const currentNid = teacher['NID[ইংরজিতে লিখুন]'];
        const isSet = currentNid && currentNid.toString().trim() !== "";
        const stateBadge = isSet ? 'bg-success' : 'bg-warning text-dark';
        const stateText = isSet ? 'সম্পন্ন' : 'বাকি আছে';

        htmlBuffer.push(`
            <div class="col-md-12 col-xl-6">
                <div class="card h-100 shadow-sm teacher-card p-3 border">
                    <span class="badge badge-status ${stateBadge}">${stateText}</span>
                    <div class="card-body d-flex flex-column p-0 pt-2">
                        <h5 class="card-title text-dark fw-bold mb-1 pe-5">${teacher['শিক্ষকের নাম (বাংলা)']}</h5>
                        <p class="text-muted small mb-2">ক্রম নং: ${teacher['ক্রম']} | <span class="text-primary fw-semibold">${teacher['পদবি']}</span></p>
                        <hr class="text-black-50 my-1">
                        <div class="small text-secondary mb-1"><strong>বিদ্যালয়:</strong> ${teacher['বিদ্যালয়ের নাম']}</div>
                        <div class="small text-secondary mb-1"><strong>মোবাইল:</strong> ${teacher['মোবাইল নম্বর'] || 'নেই'}</div>
                        <div class="small text-secondary mb-2"><strong>NID:</strong> ${isSet ? `<code class="fs-6 text-dark fw-bold bg-light px-2 py-1 rounded border">${currentNid}</code>` : '<span class="text-danger fw-medium">সংগ্রহ করা হয়নি</span>'}</div>
                        <button class="btn btn-sm ${isSet ? 'btn-outline-secondary' : 'btn-primary'} w-100 mt-auto fw-bold py-2" onclick="launchNidModal('${teacher['ক্রম']}')">
                            <i class="fa-solid fa-pen-to-square me-1"></i> ${isSet ? 'NID সংশোধন করুন' : 'NID ইনপুট দিন'}
                        </button>
                    </div>
                </div>
            </div>
        `);
    }
    
    // ব্রাউজারকে মাত্র ১ বার রেন্ডার করতে বাধ্য করা হচ্ছে (Instant Display)
    cardArea.innerHTML = htmlBuffer.join('');
}

function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        executeGlobalSearch();
    }, 200); // দ্রুত রেসপন্সের জন্য টাইম ২০০ms করা হয়েছে
}

// অতি দ্রুতগতির ইন-মেমোরি গ্লোবাল সার্চ (Ultra Fast Index Search)
function executeGlobalSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    
    const schoolPanel = document.getElementById('schoolPanelSection');
    const teachersPanel = document.getElementById('teachersPanelSection');
    const welcomeMsg = document.getElementById('welcomeMessage');
    const cardArea = document.getElementById('teachersContainer');

    if (!query) {
        if (selectedCluster) {
            onClusterSelectionChange();
        } else {
            schoolPanel.classList.add('d-none');
            teachersPanel.className = "col-lg-12";
            welcomeMsg.classList.remove('d-none');
            cardArea.classList.add('d-none');
        }
        return;
    }

    document.getElementById('clusterFilter').value = "";
    schoolPanel.classList.add('d-none');
    teachersPanel.className = "col-lg-12";
    welcomeMsg.classList.add('d-none');

    const matchResults = [];
    const dataLength = teachersData.length;
    
    // সার্চ ম্যাচিং স্পিডকে সর্বোচ্চ করার জন্য হাই-স্পিড নেটিভ ইন্ডেক্সিং লুপ
    for (let i = 0; i < dataLength; i++) {
        const teacher = teachersData[i];
        
        // বারংবার অবজেক্ট প্রোপার্টি কল এড়াতে লোকাল ভেরিয়েবল ব্যবহার
        const name = teacher['শিক্ষকের নাম (বাংলা)'];
        const serial = teacher['ক্রম'];
        const mobile = teacher['মোবাইল নম্বর'];

        const hasName = name && name.toLowerCase().indexOf(query) !== -1;
        const hasSerial = serial && serial.toString().indexOf(query) !== -1;
        const hasMobile = mobile && mobile.toString().indexOf(query) !== -1;

        if (hasName || hasSerial || hasMobile) {
            matchResults.push(teacher);
            // একসাথে স্ক্রিনে ২০টির বেশি রেজাল্ট দেখালে ব্রাউজার স্লো হয়ে যায়, তাই লিমিট ২০ করা হলো
            if (matchResults.length >= 20) break; 
        }
    }

    renderTargetTeachers(matchResults);
}

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

        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const targetIndex = teachersData.findIndex(t => t['ক্রম'].toString().trim() === targetId.toString().trim());
        if (targetIndex !== -1) {
            teachersData[targetIndex]['NID[ইংরজিতে লিখুন]'] = inputVal;
        }

        bootstrapModal.hide();
        computeDashboardMetrics();
        
        if (selectedSchool) {
            renderTargetTeachers();
        } else {
            executeGlobalSearch();
        }

    } catch (err) {
        console.error(err);
        alert("সার্ভারে ডাটা পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
        setModalButtonSpinner(false);
    }
}

function toggleLoadingState(showSpinner) {
    const loader = document.getElementById('loading');
    if (showSpinner) {
        loader.classList.remove('d-none');
    } else {
        loader.classList.add('d-none');
    }
}

function setModalButtonSpinner(isProcessing) {
    const bTxt = document.getElementById('btnText');
    const bSpin = document.getElementById('btnSpinner');
    const submitBtn = document.getElementById('saveBtn');

    if (isProcessing) {
        bTxt.innerText = "গুগল ড্রাইভে সংরক্ষণ হচ্ছে... ";
        bSpin.classList.remove('d-none');
        submitBtn.disabled = true;
    } else {
        bTxt.innerText = "সার্ভার গুগল শিটে সেভ করুন";
        bSpin.classList.add('d-none');
        submitBtn.disabled = false;
    }
}
