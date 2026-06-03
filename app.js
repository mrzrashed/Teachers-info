// আপনার গুগল অ্যাপস স্ক্রিপ্ট এর আসল Web App URL এখানে দিন
const API_URL = "https://script.google.com/macros/s/AKfycbz6R634B_sSNIpHxKfRt2OFKmA_xogjK1Z6eiHcSTzbKYvZhIXhscgGKSismZdEmDHW/exec";

let teachersData = [];
let bootstrapModal;
let selectedCluster = "";
let selectedSchool = "";

document.addEventListener("DOMContentLoaded", () => {
    bootstrapModal = new bootstrap.Modal(document.getElementById('nidModal'));
    fetchLiveSheetsData();

    // Event Handler Mappings
    document.getElementById('clusterFilter').addEventListener('change', onClusterSelectionChange);
    document.getElementById('searchInput').addEventListener('input', executeGlobalSearch);
    document.getElementById('nidForm').addEventListener('submit', executeFormPipeline);
});

// গুগল শিট ডাটাবেজ থেকে এপিআই এর মাধ্যমে ডাটা স্ট্রিমিং
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

// মূল ড্যাশবোর্ড ক্যালকুলেটর 
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

// ক্লাস্টার ড্রপডাউন জেনারেটর 
function generateClusterDropdown() {
    const clusterSelect = document.getElementById('clusterFilter');
    const uniqueClusters = [...new Set(teachersData.map(t => t['ক্লাস্টার']).filter(Boolean))];
    
    clusterSelect.innerHTML = '<option value="">-- ক্লাস্টার সিলেক্ট করুন --</option>';
    uniqueClusters.sort().forEach(cluster => {
        clusterSelect.innerHTML += `<option value="${cluster}">${cluster}</option>`;
    });
}

// ধাপ ১: ইউজার ক্লাস্টার সিলেক্ট করলে বিদ্যালয়গুলোর তালিকা লোড হবে (শিক্ষকের কার্ড না)
function onClusterSelectionChange() {
    selectedCluster = document.getElementById('clusterFilter').value;
    selectedSchool = ""; // রিসেট 
    document.getElementById('searchInput').value = ""; // সার্চ রিসেট

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

    // নির্দিষ্ট ক্লাস্টারের অন্তর্ভুক্ত স্কুল ফিল্টারিং
    const schools = [...new Set(teachersData
        .filter(t => t['ক্লাস্টার'] === selectedCluster)
        .map(t => t['বিদ্যালয়ের নাম']).filter(Boolean))].sort();

    document.getElementById('schoolCount').innerText = schools.length;

    // প্যানেল লেআউট পরিবর্তন 
    welcomeMsg.classList.add('d-none');
    schoolPanel.classList.remove('d-none');
    teachersPanel.className = "col-lg-8"; // শিক্ষকদের জন্য বাকি ৮ কলাম বরাদ্দ

    // স্ক্রিনে স্কুলের বাটন প্যানেল রেন্ডার
    schoolListContainer.innerHTML = "";
    schools.forEach((school, index) => {
        schoolListContainer.innerHTML += `
            <button class="btn school-btn btn-light shadow-sm p-2 text-start rounded text-truncate" data-school="${school}" onclick="onSchoolButtonClick(this)">
                <i class="fa-solid fa-school text-muted me-2 small"></i>${school}
            </button>
        `;
    });
}

// ধাপ ২: ইউজার সুনির্দিষ্ট বিদ্যালয়ে ক্লিক করলে তাৎক্ষণিক কার্ড রেন্ডার হবে (রকেট গতি)
function onSchoolButtonClick(buttonElement) {
    // অ্যাক্টিভ বাটন স্টাইল টগল 
    document.querySelectorAll('.school-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');

    selectedSchool = buttonElement.getAttribute('data-school');
    renderTargetTeachers();
}

// সুনির্দিষ্ট স্কুলের শিক্ষকদের কার্ড বানানোর ইঞ্জিন 
function renderTargetTeachers(customDataset = null) {
    const cardArea = document.getElementById('teachersContainer');
    cardArea.innerHTML = "";
    cardArea.classList.remove('d-none');

    // যদি গ্লোবাল সার্চ থেকে ডেটা আসে অথবা সিলেক্টেড স্কুল থেকে আসে
    let filteredList = customDataset;
    if (!filteredList) {
        filteredList = teachersData.filter(t => t['ক্লাস্টার'] === selectedCluster && t['বিদ্যালয়ের নাম'] === selectedSchool);
    }

    if (filteredList.length === 0) {
        cardArea.innerHTML = `<div class="col-12 text-center text-muted my-4"><h5>কোনো শিক্ষকের তথ্য পাওয়া যায়নি!</h5></div>`;
        return;
    }

    // লুপ চালিয়ে কার্ড রেন্ডার করা (এটি মাত্র কয়েক মিলি-সেকেন্ড সময় নিবে)
    filteredList.forEach(teacher => {
        const currentNid = teacher['NID[ইংরজিতে লিখুন]'];
        const isSet = currentNid && currentNid.toString().trim() !== "";
        const stateBadge = isSet ? 'bg-success' : 'bg-warning text-dark';
        const stateText = isSet ? 'সম্পন্ন' : 'বাকি আছে';

        const card = `
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
        `;
        cardArea.innerHTML += card;
    });
}

// এক্সক্লুসিভ গ্লোবাল সার্চ: ক্লাস্টার বা স্কুল ছাড়াই যেকোনো শিক্ষক খোঁজার জন্য
function executeGlobalSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    
    const schoolPanel = document.getElementById('schoolPanelSection');
    const teachersPanel = document.getElementById('teachersPanelSection');
    const welcomeMsg = document.getElementById('welcomeMessage');

    if (!query) {
        // সার্চ খালি থাকলে আগের ফিল্টারিং অবস্থায় ফেরত যাবে
        if (selectedCluster) {
            onClusterSelectionChange();
        } else {
            schoolPanel.classList.add('d-none');
            teachersPanel.className = "col-lg-12";
            welcomeMsg.classList.remove('d-none');
            document.getElementById('teachersContainer').classList.add('d-none');
        }
        return;
    }

    // ড্রপডাউন ভ্যালু রিসেট
    document.getElementById('clusterFilter').value = "";
    schoolPanel.classList.add('d-none');
    teachersPanel.className = "col-lg-12";
    welcomeMsg.classList.add('d-none');

    // গ্লোবাল ফিল্টার ম্যাপিং
    const matchResults = teachersData.filter(teacher => {
        const dataSeed = `${teacher['শিক্ষকের নাম (বাংলা)']} ${teacher['ক্রম']} ${teacher['মোবাইল নম্বর']}`.toLowerCase();
        return dataSeed.includes(query);
    });

    renderTargetTeachers(matchResults);
}

// মোডাল প্যানেল হাইড্রেশন 
function launchNidModal(serialId) {
    const match = teachersData.find(t => t['ক্রম'].toString().trim() === serialId.toString().trim());
    if (!match) return;

    document.getElementById('mId').value = match['ক্রম'];
    document.getElementById('mName').innerText = match['শিক্ষকের নাম (বাংলা)'];
    document.getElementById('mDesignation').innerText = match['পদবি'];
    document.getElementById('mSchool').innerText = match[' विद्यालयों নাম'] || match['বিদ্যালয়ের নাম'];
    
    const nInput = document.getElementById('nidInput');
    nInput.value = match['NID[ইংরজিতে লিখুন]'] || "";
    nInput.classList.remove('is-invalid');

    bootstrapModal.show();
}

function isValidNIDPattern(nidValue) {
    return /^\d+$/.test(nidValue) && (nidValue.length === 10 || nidValue.length === 13 || nidValue.length === 17);
}

// গুগল শিট ব্যাকএন্ডে ডেটা পাঠানোর সাবমিশন মেকানিজম
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

        // লাইভ ক্যাশ মেমোরিতে এনআইডি সেভ ও ইন্টারফেস রিফ্রেশ করা 
        const targetIndex = teachersData.findIndex(t => t['क्रम'] || t['ক্রম'].toString().trim() === targetId.toString().trim());
        if (targetIndex !== -1) {
            teachersData[targetIndex]['NID[ইংরজিতে লিখুন]'] = inputVal;
        }

        bootstrapModal.hide();
        computeDashboardMetrics();
        
        // বর্তমান অবস্থা ধরে রাখা 
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
