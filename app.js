// আপনার গুগল অ্যাপস স্ক্রিপ্ট এর আসল Web App URL এখানে দিন
const API_URL = "https://script.google.com/macros/s/AKfycbz6R634B_sSNIpHxKfRt2OFKmA_xogjK1Z6eiHcSTzbKYvZhIXhscgGKSismZdEmDHW/exec";

let teachersData = [];
let bootstrapModal;

document.addEventListener("DOMContentLoaded", () => {
    bootstrapModal = new bootstrap.Modal(document.getElementById('nidModal'));
    fetchLiveSheetsData();

    // ড্রপডাউন পরিবর্তনের ইভেন্ট লিসেনার
    document.getElementById('clusterFilter').addEventListener('change', onClusterDropdownChange);
    document.getElementById('schoolFilter').addEventListener('change', onSchoolDropdownChange);
    document.getElementById('nidForm').addEventListener('submit', executeFormPipeline);
});

// গুগল শিট ডাটাবেজ থেকে ডাটা স্ট্রিমিং
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

// ১ম ড্রপডাউন: ক্লাস্টার লিস্ট জেনারেট করা
function generateClusterDropdown() {
    const clusterSelect = document.getElementById('clusterFilter');
    const uniqueClusters = [...new Set(teachersData.map(t => t['ক্লাস্টার']).filter(Boolean))];
    
    clusterSelect.innerHTML = '<option value="">-- প্রথমে ক্লাস্টার সিলেক্ট করুন --</option>';
    uniqueClusters.sort().forEach(cluster => {
        clusterSelect.innerHTML += `<option value="${cluster}">${cluster}</option>`;
    });
}

// ধাপ ১: ক্লাস্টার পরিবর্তন হলে ২য় (বিদ্যালয়) ড্রপডাউন লোড হবে
function onClusterDropdownChange() {
    const selectedCluster = document.getElementById('clusterFilter').value;
    const schoolSelect = document.getElementById('schoolFilter');
    const welcomeMsg = document.getElementById('welcomeMessage');
    const cardArea = document.getElementById('teachersContainer');

    // রিসেট এবং হাইড লজিক
    schoolSelect.innerHTML = '<option value="">-- বিদ্যালয় সিলেক্ট করুন --</option>';
    schoolSelect.disabled = true;
    cardArea.classList.add('d-none');
    welcomeMsg.classList.remove('d-none');

    if (!selectedCluster) return;

    // নির্দিষ্ট ক্লাস্টারের স্কুল ফিল্টারিং
    const schools = [...new Set(teachersData
        .filter(t => t['ক্লাস্টার'] === selectedCluster)
        .map(t => t['বিদ্যালয়ের নাম']).filter(Boolean))].sort();

    // ২য় ড্রপডাউন পপুলেট ও আনলক করা
    schools.forEach(school => {
        schoolSelect.innerHTML += `<option value="${school}">${school}</option>`;
    });
    schoolSelect.disabled = false;
}

// ধাপ ২: বিদ্যালয় সিলেক্ট করলে সাথে সাথে শিক্ষকদের তালিকা দেখাবে (Instant)
function onSchoolDropdownChange() {
    const selectedCluster = document.getElementById('clusterFilter').value;
    const selectedSchool = document.getElementById('schoolFilter').value;
    const welcomeMsg = document.getElementById('welcomeMessage');
    const cardArea = document.getElementById('teachersContainer');

    if (!selectedSchool) {
        cardArea.classList.add('d-none');
        welcomeMsg.classList.remove('d-none');
        return;
    }

    welcomeMsg.classList.add('d-none');
    cardArea.textContent = ''; 
    cardArea.classList.remove('d-none');

    // নির্দিষ্ট বিদ্যালয়ের শিক্ষক ফিল্টার (ইন-মেমোরি ফাস্ট রান)
    const filteredList = teachersData.filter(t => t['ক্লাস্টার'] === selectedCluster && t['বিদ্যালয়ের নাম'] === selectedSchool);

    if (filteredList.length === 0) {
        cardArea.innerHTML = `<div class="col-12 text-center text-muted my-4"><h5>কোনো শিক্ষকের তথ্য পাওয়া যায়নি!</h5></div>`;
        return;
    }

    // হাই-স্পিড বাফার দিয়ে এইচটিএমএল জেনারেট করা (১ মিলি-সেকেন্ড)
    const htmlBuffer = [];
    const len = filteredList.length;

    for (let i = 0; i < len; i++) {
        const teacher = filteredList[i];
        const currentNid = teacher['NID[ইংরজিতে লিখুন]'];
        const isSet = currentNid && currentNid.toString().trim() !== "";
        const stateBadge = isSet ? 'bg-success' : 'bg-warning text-dark';
        const stateText = isSet ? 'সম্পন্ন' : 'বাকি আছে';

        htmlBuffer.push(`
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 shadow-sm teacher-card p-3 border">
                    <span class="badge badge-status ${stateBadge}">${stateText}</span>
                    <div class="card-body d-flex flex-column p-0 pt-2">
                        <h5 class="card-title text-dark fw-bold mb-1 pe-5">${teacher['শিক্ষকের নাম (বাংলা)']}</h5>
                        <p class="text-muted small mb-2">ক্রম নং: ${teacher['ক্রম']} | <span class="text-primary fw-semibold">${teacher['পদবি']}</span></p>
                        <hr class="text-black-50 my-1">
                        <div class="small text-secondary mb-1"><strong>মোবাইল:</strong> ${teacher['মোবাইল নম্বর'] || 'নেই'}</div>
                        <div class="small text-secondary mb-3"><strong>NID:</strong> ${isSet ? `<code class="fs-6 text-dark fw-bold bg-light px-2 py-1 rounded border">${currentNid}</code>` : '<span class="text-danger fw-medium">সংগ্রহ করা হয়নি</span>'}</div>
                        <button class="btn btn-sm ${isSet ? 'btn-outline-secondary' : 'btn-primary'} w-100 mt-auto fw-bold py-2" onclick="launchNidModal('${teacher['ক্রম']}')">
                            <i class="fa-solid fa-pen-to-square me-1"></i> ${isSet ? 'NID সংশোধন করুন' : 'NID ইনপুট দিন'}
                        </button>
                    </div>
                </div>
            </div>
        `);
    }
    
    // ডম-এ একবারে পুরো ডিজাইনটি রাইট করা
    cardArea.innerHTML = htmlBuffer.join('');
}

// মোডাল প্যানেল ডাটা সেটআপ
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

// স্প্রেডশিটে ডেটা সাবমিশন পাইপলাইন
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

        // লাইভ ক্যাশ মেমোরি আপডেট
        const targetIndex = teachersData.findIndex(t => t['ক্রম'].toString().trim() === targetId.toString().trim());
        if (targetIndex !== -1) {
            teachersData[targetIndex]['NID[ইংরজিতে লিখুন]'] = inputVal;
        }

        bootstrapModal.hide();
        computeDashboardMetrics();
        
        // তালিকা রিফ্রেশ করা
        onSchoolDropdownChange();

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
