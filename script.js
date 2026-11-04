/* ==========================================
   0. SUPABASE CONFIGURATION (SECURE CLIENT)
   ========================================== */
const SUPABASE_URL = 'https://hbsvhyiasgpuwxbkytkd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_D9T2ML4EXmx1mdu6qwkMVQ_WU49_Z6M';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================
   1. APPLICATION STATE (MULTI-STORE & DATA)
   ========================================== */
let currentStoreId = 1;       
let loggedInStoreId = null;   
let isOwner = false;          
let authMode = 'login';       

let productsList = [];
let groupsList = [];
let categoriesList = [];
let uploadedImagesList = [];
let calcExpression = "";

let storeLogoData = null;
let ownerPhotoData = null;
let storeBannerData = null;

let currentSlideIndex = 0;
let heroSlideTimer = null;

const $ = id => document.getElementById(id);
const q = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const IMG = 'https://placehold.co/300x300/d4af37/ffffff?text=Product';

const DEF = {
    theme: '#d4af37',
    live: true,
    view: { price: true, weight: true, category: true, code: true },
    slider: { on: true, sec: 3 },
    gold: { '24K': 100, '22K': 91.67, '18K': 75, '14K': 58.33, '9K': 37.5 },
    silver: { '999 Fine': 100, '958 Britannia': 95.8, '925 Sterling': 92.5, '800 European': 80 }
};

let S = {
    name: 'Your Store Name',
    owner: '',
    mobile: '',
    email: '',
    address: '',
    extra: JSON.parse(JSON.stringify(DEF))
};

let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let customers = [];
let stack = [];
let _cat = null;

const BASE = () => location.origin + location.pathname;
const catLink = () => `${BASE()}?store=${currentStoreId}`;
const prodLink = id => `${BASE()}?store=${currentStoreId}&product=${id}`;
const pcode = p => p.code || '#' + String(p.id).padStart(4, '0');
const pnum = p => parseFloat(String(p.price).replace(/[^\d.]/g, '')) || 0;
const pimg = p => (p.images && p.images[0]) || IMG;
const ownerNo = () => (S.mobile || '').replace(/\D/g, '').slice(-10);
const wa = (num, text) => window.open('https://wa.me/' + (num ? '91' + String(num).replace(/\D/g, '').slice(-10) : '') + '?text=' + encodeURIComponent(text), '_blank');

/* ==========================================
   2. INITIALIZATION ON PAGE LOAD
   ========================================== */
window.addEventListener('DOMContentLoaded', async () => {
    await initializeMultiStoreSession();
    await loadAllDataFromSupabase();
    startHeroSlideshow();
});

async function initializeMultiStoreSession() {
    const params = new URLSearchParams(window.location.search);
    const urlStore = params.get('store');

    const savedSession = localStorage.getItem('ubc_owner_session');
    if (savedSession) {
        try {
            const parsed = JSON.parse(savedSession);
            if (parsed && parsed.store_id) {
                loggedInStoreId = parsed.store_id;
            }
        } catch (e) {
            localStorage.removeItem('ubc_owner_session');
        }
    }

    if (!loggedInStoreId) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            const { data: storeData } = await supabaseClient
                .from('store_settings')
                .select('id')
                .eq('user_id', session.user.id)
                .maybeSingle();
            if (storeData) {
                loggedInStoreId = storeData.id;
            }
        }
    }

    if (urlStore) {
        currentStoreId = urlStore; 
    } else if (loggedInStoreId) {
        currentStoreId = loggedInStoreId;
    } else {
        currentStoreId = 1;
    }

    isOwner = Boolean(loggedInStoreId && String(loggedInStoreId) === String(currentStoreId));
    updateAuthUIVisibility();
}
;


function updateAuthUIVisibility() {
    const ownerWrapper = $('ownerDashboardWrapper');
    const backBtn = $('catalogueBackBtn');
    const guestMenu = $('guestAuthMenuLinks');
    const ownerMenu = $('ownerAuthMenuLinks');
    const regBanner = $('registerStoreMainBanner');
    const ownerFooterBtn = $('ownerReturnFooterBtn');

    if (isOwner) {
        if (backBtn) backBtn.classList.remove('hidden');
        if (guestMenu) guestMenu.classList.add('hidden');
        if (ownerMenu) ownerMenu.classList.remove('hidden');
        if (regBanner) regBanner.classList.add('hidden');
        if (ownerFooterBtn) ownerFooterBtn.classList.remove('hidden');
    } else {
        if (ownerWrapper) {
            ownerWrapper.classList.add('hidden');
            ownerWrapper.classList.remove('flex');
        }
        if (backBtn) backBtn.classList.add('hidden');
        if (guestMenu) guestMenu.classList.remove('hidden');
        if (ownerMenu) ownerMenu.classList.add('hidden');
        if (regBanner) regBanner.classList.remove('hidden');
        if (ownerFooterBtn) ownerFooterBtn.classList.add('hidden');
    }
}

/* ==========================================
   3. FETCH STORE-SPECIFIC DATA FROM SUPABASE */
async function loadAllDataFromSupabase() {
    try {
        let { data: settings } = await supabaseClient
            .from('store_settings')
            .select('*')
            .eq('id', currentStoreId)
            .maybeSingle();

        if (!settings && !isOwner) {
            const { data: firstStore } = await supabaseClient
                .from('store_settings')
                .select('*')
                .order('id', { ascending: true })
                .limit(1)
                .maybeSingle();
            if (firstStore) {
                settings = firstStore;
                currentStoreId = firstStore.id;
            }
        }

        if (settings) {
            S.name = settings.store_name || 'Your Store Name';
            S.owner = settings.owner_name !== 'Not Provided' ? (settings.owner_name || '') : '';
            S.mobile = settings.mobile !== 'Not Provided' ? (settings.mobile || '') : '';
            S.email = settings.email !== 'Not Provided' ? (settings.email || '') : '';
            S.address = settings.address !== 'Not Provided' ? (settings.address || '') : '';
            S.extra = JSON.parse(JSON.stringify(Object.assign({}, DEF, settings.extra || {})));

            $('inputStoreName').value = S.name !== 'Your Store Name' ? S.name : '';
            $('inputOwnerName').value = S.owner;
            $('inputMobile').value = S.mobile;
            $('inputEmail').value = S.email;
            $('inputAddress').value = S.address;

            $('headerStoreName').innerText = S.name;
            $('profileStoreName').innerText = S.name;
            $('catStoreName').innerText = S.name;
            document.title = S.name;

            $('profileOwnerName').innerText = S.owner || 'Not Provided';
            $('profileMobile').innerText = S.mobile || 'Not Provided';
            $('profileWhatsapp').innerText = settings.whatsapp || S.mobile || 'Not Provided';
            $('profileEmail').innerText = S.email || 'Not Provided';
            $('profileStoreAddress').innerText = S.address || 'Not Provided';

            $('sidebarMobileDisplay').innerText = S.mobile ? S.mobile : "Add Mobile No.";
            $('sidebarEmailDisplay').innerText = S.email ? S.email : "Add Email in Profile";

            const defaultLogo = "https://placehold.co/100x100/d4af37/ffffff?text=Logo";
            $('storeLogoPreview').src = settings.logo_url || defaultLogo;
            $('storeProfileAvatar').src = settings.logo_url || defaultLogo;
            $('catStoreLogo').src = settings.logo_url || defaultLogo;

            $('ownerPhotoPreview').src = settings.owner_photo_url || "https://placehold.co/100x100/d4af37/ffffff?text=Owner";
            const defaultBanner = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60";
            const bannerUrl = settings.banner_url || defaultBanner;
            $('storePhotoPreview').src = bannerUrl;
            $('profileBannerImg').src = bannerUrl;
            if ($('slideImg1')) $('slideImg1').src = bannerUrl;

            $('baseGoldRateInput').value = settings.gold_rate_24k || '';
            $('baseSilverRateInput').value = settings.silver_rate_kg || '';
            recalculateMetalRates();
        }

        // Strict Store Isolation: सिर्फ currentStoreId का डेटा ही डेटाबेस से लाएं
        const { data: groups } = await supabaseClient
            .from('groups')
            .select('*')
            .eq('store_id', currentStoreId)
            .order('id');
        groupsList = groups || [];

        const { data: categories } = await supabaseClient
            .from('categories')
            .select('*')
            .eq('store_id', currentStoreId)
            .order('id');
        categoriesList = categories || [];

        const { data: products } = await supabaseClient
            .from('products')
            .select('*')
            .eq('store_id', currentStoreId)
            .order('id', { ascending: false });
        productsList = products || [];

        if ($('dashProdCountBadge')) $('dashProdCountBadge').innerText = productsList.length;
        if ($('profileTotalProdCount')) $('profileTotalProdCount').innerText = productsList.length;

        if (isOwner) {
            const { data: ledger } = await supabaseClient
                .from('ledger_entries')
                .select('*')
                .eq('store_id', currentStoreId)
                .order('id');
            const storeLedger = ledger || [];
            const tbody = $('ledgerTableBody');
            if (tbody) {
                tbody.innerHTML = '';
                storeLedger.forEach((entry, idx) => renderLedgerRowUI(entry, idx + 1));
                calculateLedgerTotals();
            }
            await loadCustomers();
        }

        renderGroupsAndCategories();
        renderCatalogueCategories();
        renderCatalogueProducts();
        updateSlideshowWithProducts();
        wireExtraControls();
        applyExtra();
        updateCartBadge();
        buildRates();
        routeInitialScreen();

    } catch (err) {
        console.error("Supabase data load error:", err);
    }
}



function routeInitialScreen() {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('product');
    const forceCat = params.get('catalogue');

    if (isOwner && !forceCat && !pid) {
        switchScreen('dashboardScreen');
    } else {
        switchScreen('viewCatalogueScreen');
    }

    if (pid) {
        openProduct(Number(pid));
    }
}

/* ==========================================
   4. SCREEN & TAB NAVIGATION
   ========================================== */
function switchTab(tabName) {
    const catTab = $('tabCatalogue');
    const custTab = $('tabCustomers');
    const finTab = $('tabFinance');

    const catContent = $('contentCatalogue');
    const custContent = $('contentCustomers');
    const finContent = $('contentFinance');

    const inactiveClass = "inline-flex items-center space-x-1 py-3 text-slate-500 font-medium text-sm px-4 hover:text-slate-700 transition flex-shrink-0";
    const activeClass = "inline-flex items-center space-x-1 py-3 border-b-2 border-amber-600 text-amber-700 font-bold text-sm px-4 transition flex-shrink-0";

    catTab.className = inactiveClass;
    custTab.className = inactiveClass;
    finTab.className = inactiveClass;

    catContent.classList.add('hidden');
    custContent.classList.add('hidden');
    finContent.classList.add('hidden');

    if (tabName === 'catalogue') {
        catTab.className = activeClass;
        catContent.classList.remove('hidden');
    } else if (tabName === 'customers') {
        custTab.className = activeClass;
        custContent.classList.remove('hidden');
    } else if (tabName === 'finance') {
        finTab.className = activeClass;
        finContent.classList.remove('hidden');
    }
}

function switchScreen(screenId) {
    const ownerOnlyScreens = ['dashboardScreen', 'addProductScreen', 'editProfileScreen', 'categoriesScreen', 'metalRatesScreen', 'settingsScreen'];
    if (!isOwner && ownerOnlyScreens.includes(screenId)) {
        screenId = 'viewCatalogueScreen';
    }

    const overlayScreens = [
        'addProductScreen',
        'editProfileScreen',
        'categoriesScreen',
        'metalRatesScreen',
        'viewCatalogueScreen',
        'storeProfileScreen',
        'settingsScreen',
        'productDetailScreen'
    ];

    overlayScreens.forEach(id => {
        const el = $(id);
        if (el) el.classList.add('hidden');
    });

    const ownerWrapper = $('ownerDashboardWrapper');

    if (screenId === 'dashboardScreen') {
        if (ownerWrapper) {
            ownerWrapper.classList.remove('hidden');
            ownerWrapper.classList.add('flex');
        }
    } else {
        if (!isOwner && ownerWrapper) {
            ownerWrapper.classList.add('hidden');
            ownerWrapper.classList.remove('flex');
        }
        const target = $(screenId);
        if (target) {
            target.classList.remove('hidden');
            target.scrollTop = 0;
        }
    }

    if (screenId === 'viewCatalogueScreen') {
        updateAuthUIVisibility();
        renderCatalogueCategories();
        renderCatalogueProducts(_cat);
    }
}

function toggleHamburgerMenu() {
    const sidebar = $('hamburgerSidebar');
    const overlay = $('sidebarOverlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

/* ==========================================
   5. HAMBURGER MENU ACTIONS (OWNER SIDE)
   ========================================== */
function openMyProfileFromMenu() {
    const editBtnWrap = $('ownerEditProfileBtnWrapper');
    if (editBtnWrap) {
        editBtnWrap.classList.toggle('hidden', !isOwner);
    }
    switchScreen('storeProfileScreen');
}

function openReadOnlyStoreProfile() {
    const editBtnWrap = $('ownerEditProfileBtnWrapper');
    if (editBtnWrap) {
        editBtnWrap.classList.add('hidden');
    }
    switchScreen('storeProfileScreen');
}

function goBackFromStoreProfile() {
    if (isOwner) {
        switchScreen('dashboardScreen');
    } else {
        switchScreen('viewCatalogueScreen');
    }
}

function openOwnerClientCatalog() {
    switchScreen('viewCatalogueScreen');
}

function openSettingsPage() {
    settingsScreen();
}

function openLogoutConfirmModal() {
    closeModals();
    $('modalOverlay').classList.remove('hidden');
    $('logoutConfirmModal').classList.remove('hidden');
}

async function confirmFullLogout() {
    closeModals();
    localStorage.removeItem('ubc_owner_session');
    try {
        await supabaseClient.auth.signOut();
    } catch (e) {}

    loggedInStoreId = null;
    isOwner = false;
    updateAuthUIVisibility();
    switchScreen('viewCatalogueScreen');
    alertBox('Logged out successfully! Returned to Client Catalogue.');
}

function menuAction(featureName) {
    if (featureName === 'Subscription' || featureName === 'Privacy Policy') {
        alertBox(`${featureName}: Coming Soon!`);
    } else if (featureName === 'Logout') {
        openLogoutConfirmModal();
    } else {
        alertBox(`${featureName}: Coming Soon!`);
    }
}

function alertBox(message) {
    const banner = document.createElement('div');
    banner.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl z-[100] transition-all';
    banner.innerText = message;
    document.body.appendChild(banner);
    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
    }, 2500);
}

/* ==========================================
   6. SECURE AUTHENTICATION (SUPABASE AUTH & INPUT VALIDATION)
   ========================================== */
function openAuthModal(mode = 'login') {
    closeModals();
    $('modalOverlay').classList.remove('hidden');
    $('authModal').classList.remove('hidden');
    switchAuthTab(mode);
}

function switchAuthTab(mode) {
    authMode = mode;
    const loginTab = $('authTabLogin');
    const signupTab = $('authTabSignup');
    const extraFields = $('signupExtraFields');
    const title = $('authModalTitle');
    const submitBtn = $('authSubmitBtn');

    if (mode === 'signup') {
        title.innerText = 'Register Your Store';
        submitBtn.innerText = 'Create Store & Login';
        extraFields.classList.remove('hidden');
        signupTab.className = 'py-2 rounded-lg bg-white text-slate-900 shadow-sm transition';
        loginTab.className = 'py-2 rounded-lg text-slate-500 transition';
    } else {
        title.innerText = 'Owner Login';
        submitBtn.innerText = 'Login to Store';
        extraFields.classList.add('hidden');
        loginTab.className = 'py-2 rounded-lg bg-white text-slate-900 shadow-sm transition';
        signupTab.className = 'py-2 rounded-lg text-slate-500 transition';
    }
}

async function handleAuthSubmit() {
    const usernameInput = $('authUsernameInput').value.trim();
    const password = $('authPasswordInput').value.trim();

    if (!usernameInput || !password) {
        return alertBox('Please enter both username/email and password!');
    }
    if (password.length < 6) {
        return alertBox('Password must be at least 6 characters long.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const loginEmail = emailRegex.test(usernameInput) 
        ? usernameInput 
        : `${usernameInput.toLowerCase().replace(/[^a-z0-9]/g, '')}@store-portal.local`;

    if (authMode === 'signup') {
        const storeName = $('authStoreNameInput').value.trim();
        const ownerName = $('authOwnerNameInput').value.trim();
        const mobile = $('authMobileInput').value.trim();

        if (!storeName || !ownerName || !mobile) {
            return alertBox('Please fill Store Name, Owner Name, and Mobile!');
        }
        if (mobile.replace(/\D/g, '').length < 10) {
            return alertBox('Please enter a valid 10-digit mobile number.');
        }

        // 1. Signup via Supabase Auth
        const { data: authData, error: authErr } = await supabaseClient.auth.signUp({
            email: loginEmail,
            password: password,
            options: {
                data: { store_name: storeName, owner_name: ownerName }
            }
        });

        if (authErr || !authData.user) {
            return alertBox('Registration error: ' + (authErr?.message || 'Could not sign up.'));
        }

        const userUUID = authData.user.id;

        // 2. Insert into store_settings (id auto-generate hoga, user_id mein UUID jayega)
        const newStorePayload = {
            user_id: userUUID,
            store_name: storeName,
            owner_name: ownerName,
            mobile: mobile,
            whatsapp: mobile,
            email: loginEmail,
            username: usernameInput,
            address: 'Not Provided',
            gold_rate_24k: 75000,
            silver_rate_kg: 90000,
            updated_at: new Date().toISOString()
        };

        const { data: insertedStore, error: storeErr } = await supabaseClient
            .from('store_settings')
            .insert([newStorePayload])
            .select()
            .single();

        if (storeErr || !insertedStore) {
            console.error("Supabase Insert Error:", storeErr);
            return alertBox('Error: ' + (storeErr?.message || 'Error creating store profile in database.'));
        }

        // Store ki auto-generated numeric ID use karein
        loggedInStoreId = insertedStore.id;
        currentStoreId = insertedStore.id;
        isOwner = true;
        localStorage.setItem('ubc_owner_session', JSON.stringify({
            store_id: insertedStore.id,
            user_id: userUUID,
            username: loginEmail
        }));

        closeModals();
        window.history.replaceState({}, '', `${BASE()}?store=${currentStoreId}`);
        await loadAllDataFromSupabase();
        switchScreen('dashboardScreen');
        alertBox(`Welcome! "${storeName}" is now live.`);
    } else {
        // 1. Login via Supabase Auth
        const { data: authData, error: authErr } = await supabaseClient.auth.signInWithPassword({
            email: loginEmail,
            password: password
        });

        if (authErr || !authData.user) {
            return alertBox('Invalid username/email or password!');
        }

        // 2. user_id se store ki numeric id निकाले
        const { data: storeData, error: fetchErr } = await supabaseClient
            .from('store_settings')
            .select('id')
            .eq('user_id', authData.user.id)
            .maybeSingle();

        const storeIdToUse = storeData ? storeData.id : 1;

        loggedInStoreId = storeIdToUse;
        currentStoreId = storeIdToUse;
        isOwner = true;
        localStorage.setItem('ubc_owner_session', JSON.stringify({
            store_id: storeIdToUse,
            user_id: authData.user.id,
            username: loginEmail
        }));

        closeModals();
        window.history.replaceState({}, '', `${BASE()}?store=${currentStoreId}`);
        await loadAllDataFromSupabase();
        switchScreen('dashboardScreen');
        alertBox('Logged in successfully!');
    }
               }
           
            


/* ==========================================
   7. SHARE & COPY LINK MODAL
   ========================================== */
function openShareModal() {
    closeModals();
    const urlInput = $('shareCatalogueUrlInput');
    if (urlInput) {
        urlInput.value = catLink();
    }
    $('modalOverlay').classList.remove('hidden');
    $('shareModal').classList.remove('hidden');
}

function copyStoreCatalogueLink() {
    const link = catLink();
    navigator.clipboard.writeText(link).then(() => {
        alertBox('Store Link Copied to Clipboard!');
    }).catch(() => {
        const input = $('shareCatalogueUrlInput');
        if (input) {
            input.select();
            document.execCommand('copy');
            alertBox('Store Link Copied!');
        }
    });
}

function shareOnWhatsApp() {
    const msg = `*Visit our online store catalogue to see the latest collection:*\n${catLink()}\n\n*${S.name}*\n${S.mobile ? 'Contact: ' + S.mobile : ''}`;
    wa('', msg);
}

function callStoreNow() {
    if (ownerNo()) {
        window.location.href = 'tel:+91' + ownerNo();
    } else {
        alertBox('Store mobile number not provided');
    }
}

function whatsappStoreNow() {
    if (ownerNo()) {
        wa(ownerNo(), `Hello ${S.name}, I am viewing your online catalogue.`);
    } else {
        alertBox('Store WhatsApp number not provided');
    }
}

/* ==========================================
   8. HERO SLIDESHOW (MOBILE & DESKTOP)
   ========================================== */
function startHeroSlideshow() {
    if (heroSlideTimer) clearInterval(heroSlideTimer);
    heroSlideTimer = setInterval(() => {
        changeSlide(1);
    }, (S.extra?.slider?.sec || 3) * 1000);
}

function changeSlide(direction) {
    const slides = document.querySelectorAll('#slideshowTrack .slide-item');
    if (!slides || slides.length === 0) return;

    slides[currentSlideIndex].classList.remove('opacity-100');
    slides[currentSlideIndex].classList.add('opacity-0', 'pointer-events-none');

    currentSlideIndex = (currentSlideIndex + direction + slides.length) % slides.length;

    slides[currentSlideIndex].classList.remove('opacity-0', 'pointer-events-none');
    slides[currentSlideIndex].classList.add('opacity-100');
}

function updateSlideshowWithProducts() {
    const wrapper = $('catalogueSlideshowWrapper');
    if (!wrapper) return;
    if (S.extra && S.extra.slider && S.extra.slider.on === false) {
        wrapper.classList.add('hidden');
        return;
    }
    wrapper.classList.remove('hidden');

    if ($('slideTitle1')) $('slideTitle1').innerText = S.name || 'Exclusive Collection';
    if (productsList.length > 0 && productsList[0].images && productsList[0].images[0]) {
        if ($('slideImg2')) $('slideImg2').src = productsList[0].images[0];
    }
}

/* ==========================================
   9. PROFILE MANAGEMENT (STORE ISOLATED)
   ========================================== */
async function saveProfileChanges() {
    if (!isOwner) return alertBox('Unauthorized!');

    const storeName = $('inputStoreName').value.trim() || "Your Store Name";
    const ownerName = $('inputOwnerName').value.trim() || "Not Provided";
    const mobile = $('inputMobile').value.trim() || "Not Provided";
    const email = $('inputEmail').value.trim() || "Not Provided";
    const address = $('inputAddress').value.trim() || "Not Provided";

    const updatePayload = {
        store_name: storeName,
        owner_name: ownerName,
        mobile: mobile,
        whatsapp: mobile,
        email: email,
        address: address,
        updated_at: new Date().toISOString()
    };

    if (storeLogoData) updatePayload.logo_url = storeLogoData;
    if (ownerPhotoData) updatePayload.owner_photo_url = ownerPhotoData;
    if (storeBannerData) updatePayload.banner_url = storeBannerData;

    const { error } = await supabaseClient
        .from('store_settings')
        .update(updatePayload)
        .eq('id', currentStoreId);

    if (error) {
        console.error(error);
        alertBox('Error saving profile!');
        return;
    }

    S.name = storeName;
    S.owner = ownerName !== 'Not Provided' ? ownerName : '';
    S.mobile = mobile !== 'Not Provided' ? mobile : '';
    S.email = email !== 'Not Provided' ? email : '';
    S.address = address !== 'Not Provided' ? address : '';

    $('headerStoreName').innerText = storeName;
    $('profileStoreName').innerText = storeName;
    $('catStoreName').innerText = storeName;
    document.title = storeName;

    $('profileOwnerName').innerText = ownerName;
    $('profileMobile').innerText = mobile;
    $('profileWhatsapp').innerText = mobile;
    $('profileEmail').innerText = email;
    $('profileStoreAddress').innerText = address;

    $('sidebarMobileDisplay').innerText = mobile !== "Not Provided" ? mobile : "Add Mobile No.";
    $('sidebarEmailDisplay').innerText = email !== "Not Provided" ? email : "Add Email in Profile";

    switchScreen('storeProfileScreen');
    alertBox('Store Profile Updated Successfully!');
}

function previewProfileImage(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imgUrl = e.target.result;
            $(previewId).src = imgUrl;

            if (previewId === 'storeLogoPreview') {
                storeLogoData = imgUrl;
                $('storeProfileAvatar').src = imgUrl;
                $('catStoreLogo').src = imgUrl;
            }
            if (previewId === 'ownerPhotoPreview') {
                ownerPhotoData = imgUrl;
            }
            if (previewId === 'storePhotoPreview') {
                storeBannerData = imgUrl;
                $('profileBannerImg').src = imgUrl;
            }
        };
        reader.readAsDataURL(file);
    }
}

/* ==========================================
   10. PRODUCT UPLOAD & CATALOGUE CRUD
   ========================================== */
function toggleCatalogueOptionsMenu() {
    const menu = $('catalogueOptionsMenu');
    if (menu) menu.classList.toggle('hidden');
}

function toggleClientSearchBar() {
    const bar = $('clientSearchBarContainer');
    if (!bar) return;
    bar.classList.toggle('hidden');
    if (!bar.classList.contains('hidden')) {
        $('clientProductSearchInput').focus();
    }
}

function filterCatalogueProductsBySearch(query) {
    renderCatalogueProducts(_cat, (query || '').toLowerCase().trim());
}

window.addEventListener('click', function (e) {
    const menu = $('catalogueOptionsMenu');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('.fa-ellipsis-vertical') && !e.target.closest('#catalogueOptionsMenu')) {
        menu.classList.add('hidden');
    }
});

function handleImageUpload(event) {
    const files = event.target.files;
    const container = $('imagePreviewContainer');
    const countText = $('imgCountText');

    if (files.length > 0) {
        container.classList.remove('hidden');
        for (let i = 0; i < files.length; i++) {
            if (uploadedImagesList.length >= 7) break;
            const reader = new FileReader();
            reader.onload = function (e) {
                uploadedImagesList.push(e.target.result);
                const div = document.createElement('div');
                div.className = 'relative w-full h-16 bg-slate-200 rounded-xl overflow-hidden border border-amber-300 shadow-sm';
                div.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
                container.appendChild(div);
                countText.innerText = `${uploadedImagesList.length}/7`;
            };
            reader.readAsDataURL(files[i]);
        }
    }
}

async function saveAndUploadProduct() {
    if (!isOwner) return alertBox('Please login as store owner first!');

    const name = $('prodNameInput').value.trim() || "Unnamed Product";
    const category = $('productCategorySelect').value || "Uncategorized";
    const metal_type = $('prodMetalType').value || "gold";
    const purity = $('prodPurity').value || "22K";
    const size = $('prodSize').value.trim() || "";
    const weight = parseFloat($('prodWeight').value) || 0;
    const price = $('prodAutoPrice').value || "₹0";
    const description = $('prodDescInput') ? $('prodDescInput').value.trim() : "";
    const location = $('prodLocInput') ? $('prodLocInput').value.trim() : "";

    let imageUrls = [];

    const fileInput = $('productImageInput');
    if (fileInput.files && fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
            if (i >= 7) break;
            const file = fileInput.files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `store_${currentStoreId}_${Date.now()}_${i}.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('IMAGE')
                .upload(fileName, file);

            if (uploadError) {
                console.error("Image upload error:", uploadError);
                continue;
            }

            const { data: publicURLData } = supabaseClient.storage
                .from('IMAGE')
                .getPublicUrl(fileName);

            if (publicURLData) {
                imageUrls.push(publicURLData.publicUrl);
            }
        }
    }

    if (imageUrls.length === 0 && uploadedImagesList.length > 0) {
        imageUrls = [...uploadedImagesList];
    }
    if (imageUrls.length === 0) {
        imageUrls.push(IMG);
    }

    const insertObj = {
        store_id: currentStoreId,
        name,
        category,
        metal_type,
        purity,
        size,
        weight,
        price,
        images: imageUrls
    };
    if (description) insertObj.description = description;
    if (location) insertObj.location = location;

    const { data, error } = await supabaseClient
        .from('products')
        .insert([insertObj])
        .select()
        .single();

    if (error) {
        console.error(error);
        alertBox('Error uploading product!');
        return;
    }

    productsList.unshift(data);

    $('dashProdCountBadge').innerText = productsList.length;
    $('profileTotalProdCount').innerText = productsList.length;

    uploadedImagesList = [];
    fileInput.value = '';
    $('imagePreviewContainer').innerHTML = '';
    $('imagePreviewContainer').classList.add('hidden');
    $('prodNameInput').value = '';
    $('prodWeight').value = '';
    $('prodSize').value = '';
    $('prodAutoPrice').value = '₹0';
    $('imgCountText').innerText = '0/7';
    if ($('prodDescInput')) $('prodDescInput').value = '';
    if ($('prodLocInput')) $('prodLocInput').value = '';

    renderGroupsAndCategories();
    renderCatalogueCategories();
    renderCatalogueProducts();
    updateSlideshowWithProducts();
    switchScreen('dashboardScreen');
    alertBox('Product Uploaded Successfully!');
}

async function deleteProductFromSupabase(id) {
    if (!isOwner) return;
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) {
        alertBox('Error deleting product!');
        return;
    }
    productsList = productsList.filter(p => p.id !== id);
    $('dashProdCountBadge').innerText = productsList.length;
    $('profileTotalProdCount').innerText = productsList.length;
    renderCatalogueProducts(_cat);
    renderGroupsAndCategories();
    alertBox('Product Deleted!');
}

/* ==========================================
   11. DYNAMIC CATEGORIES & PRODUCT RENDERING
   ========================================== */
function renderCatalogueCategories() {
    const bar = $('catalogueCategoriesBar');
    if (!bar) return;

    const totalCount = productsList.length;
    if ($('catTotalBadge')) {
        $('catTotalBadge').innerText = _cat ? `Category: ${_cat}` : `All (${totalCount})`;
    }

    const isAllActive = !_cat;
    const allChip = `
        <button onclick="renderCatalogueProducts(null)"
            class="px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${isAllActive ? 'bg-[#d4af37] text-white' : 'bg-slate-100 text-slate-700 hover:bg-amber-50 border border-slate-200'}">
            <span>All</span>
            <span class="text-[10px] ${isAllActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'} px-1.5 py-0.2 rounded-full">${totalCount}</span>
        </button>
    `;

    const uniqueCatNames = [...new Set([
        ...categoriesList.map(c => c.name),
        ...productsList.map(p => p.category).filter(Boolean)
    ])];

    const catChips = uniqueCatNames.map(catName => {
        const count = productsList.filter(p => p.category === catName).length;
        const active = _cat === catName;
        const safeName = catName.replace(/'/g, "\\'");
        return `
            <button onclick="renderCatalogueProducts('${safeName}')"
                class="px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${active ? 'bg-[#d4af37] text-white' : 'bg-slate-100 text-slate-700 hover:bg-amber-50 border border-slate-200'}">
                <span>${q(catName)}</span>
                <span class="text-[10px] ${active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'} px-1.5 py-0.2 rounded-full">${count}</span>
            </button>
        `;
    }).join('');

    bar.innerHTML = allChip + catChips;
}

function renderCatalogueProducts(cat = null, qs = '') {
    _cat = cat;
    renderCatalogueCategories();

    const area = $('catalogueProductsArea');
    if (!area) return;
    const v = S.extra.view;
    const list = productsList.filter(p => (!cat || p.category === cat) && (!qs || (p.name + p.category + pcode(p)).toLowerCase().includes(qs)));

    area.className = 'w-full grid grid-cols-2 gap-3 pb-6';

    if (!list.length) {
        area.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-12 text-center space-y-2">
                <div class="w-14 h-14 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center text-lg shadow-inner">
                    <i class="fa-solid fa-box-open"></i>
                </div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">No products found</p>
            </div>`;
        return;
    }

    area.innerHTML = list.map(p => `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div class="relative">
        <img src="${pimg(p)}" onclick="openImg('${pimg(p)}')" class="w-full aspect-square object-cover cursor-zoom-in">
        ${v.code ? `<span class="absolute top-2 left-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">${pcode(p)}</span>` : ''}
        ${v.weight ? `<span class="absolute bottom-2 left-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">${p.weight}g</span>` : ''}
      </div>
      <div class="p-3 flex-1 flex flex-col gap-1">
        <h4 onclick="openProduct(${p.id})" class="text-xs sm:text-sm font-bold text-slate-800 cursor-pointer line-clamp-1 hover:text-amber-700">${q(p.name)}</h4>
        ${v.category ? `<span class="text-[10px] w-max bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">${q(p.category)}</span>` : ''}
        ${v.price ? `<span class="text-sm font-bold text-amber-700 mt-0.5">${q(p.price)}</span>` : ''}
        <div class="flex gap-1.5 mt-auto pt-2">
          <button onclick="addCart(${p.id})" class="flex-1 border border-slate-300 hover:bg-slate-100 rounded-lg py-1.5 text-[11px] font-bold flex items-center justify-center space-x-1">
            <i class="fa-solid fa-cart-plus"></i><span>Add</span>
          </button>
          <button onclick="shareSheet('p',${p.id})" class="border border-slate-300 hover:bg-slate-100 rounded-lg px-2.5 text-xs" title="Share / Copy">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
          ${isOwner ? `<button onclick="if(confirm('Delete product?'))deleteProductFromSupabase(${p.id})" class="border border-rose-200 text-rose-500 rounded-lg px-2 text-xs"><i class="fa-solid fa-trash-can"></i></button>` : ''}
        </div>
      </div>
    </div>`).join('');
}

/* ==========================================
   12. GROUPS & CATEGORIES CRUD
   ========================================== */
function openNewGroupModal() {
    closeModals();
    $('modalOverlay').classList.remove('hidden');
    $('groupModal').classList.remove('hidden');
}

function openNewCategoryModal() {
    closeModals();
    $('modalOverlay').classList.remove('hidden');
    $('categoryModal').classList.remove('hidden');
}

function closeModals() {
    $('modalOverlay').classList.add('hidden');
    ['groupModal', 'categoryModal', 'authModal', 'shareModal', 'logoutConfirmModal'].forEach(id => {
        const el = $(id);
        if (el) el.classList.add('hidden');
    });
}

async function saveNewGroup() {
    const input = $('newGroupNameInput');
    const name = input.value.trim();
    if (!name) return alertBox('Please enter a group name');

    const { data, error } = await supabaseClient
        .from('groups')
        .insert([{ name, store_id: currentStoreId }])
        .select()
        .single();
    if (error) return alertBox('Group already exists or error!');

    groupsList.push(data);
    input.value = '';
    renderGroupsAndCategories();
    closeModals();
    alertBox('Group Added!');
}

async function saveNewCategory() {
    const input = $('newCategoryNameInput');
    const name = input.value.trim();
    if (!name) return alertBox('Please enter a category name');

    const { data, error } = await supabaseClient
        .from('categories')
        .insert([{ name, store_id: currentStoreId }])
        .select()
        .single();
    if (error) return alertBox('Category already exists or error!');

    categoriesList.push(data);
    input.value = '';
    renderGroupsAndCategories();
    renderCatalogueCategories();
    closeModals();
    alertBox('Category Added!');
}

function renderGroupsAndCategories() {
    const groupContainer = $('groupsListContainer');
    if (groupContainer) {
        $('groupCountBadge').innerText = `${groupsList.length} groups`;
        if (groupsList.length === 0) {
            groupContainer.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm"><p class="text-xs text-slate-400">No groups created yet. Click <b>+ Group</b> to add your first group.</p></div>`;
        } else {
            groupContainer.innerHTML = groupsList.map(g => `
                <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-xs"><i class="fa-solid fa-folder"></i></div>
                        <h4 class="text-xs font-bold text-slate-800">${q(g.name)}</h4>
                    </div>
                    <button onclick="deleteGroup(${g.id})" class="text-rose-400 hover:text-rose-600 p-2"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `).join('');
        }
    }

    const catContainer = $('categoriesListContainer');
    if (catContainer) {
        $('categoryCountBadge').innerText = `${categoriesList.length} categories`;
        if (categoriesList.length === 0) {
            catContainer.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm"><p class="text-xs text-slate-400">No categories created yet. Click <b>+ Category</b> to add your first category.</p></div>`;
        } else {
            catContainer.innerHTML = categoriesList.map(c => {
                const count = productsList.filter(p => p.category === c.name).length;
                return `
                    <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center text-sky-500 font-bold text-xs"><i class="fa-solid fa-tags"></i></div>
                            <div>
                                <h4 class="text-xs font-bold text-slate-800">${q(c.name)}</h4>
                                <span class="text-[10px] text-slate-400">${count} products</span>
                            </div>
                        </div>
                        <button onclick="deleteCategory(${c.id})" class="text-rose-400 hover:text-rose-600 p-2"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                `;
            }).join('');
        }
    }

    const select = $('productCategorySelect');
    if (select) {
        select.innerHTML = `<option value="" disabled selected>Select category</option>` +
            categoriesList.map(c => `<option value="${q(c.name)}">${q(c.name)}</option>`).join('');
    }
}

async function deleteGroup(id) {
    await supabaseClient.from('groups').delete().eq('id', id);
    groupsList = groupsList.filter(g => g.id !== id);
    renderGroupsAndCategories();
}

async function deleteCategory(id) {
    await supabaseClient.from('categories').delete().eq('id', id);
    categoriesList = categoriesList.filter(c => c.id !== id);
    renderGroupsAndCategories();
    renderCatalogueCategories();
}

/* ==========================================
   13. METAL RATES & AUTO PRICE CALCULATION
   ========================================== */
function recalculateMetalRates() {
    const goldBase = parseFloat($('baseGoldRateInput')?.value) || 0;
    const silverBase = parseFloat($('baseSilverRateInput')?.value) || 0;

    if ($('dashGoldRate')) $('dashGoldRate').innerHTML = `₹${goldBase.toLocaleString('en-IN')}<span class="text-[10px] text-slate-500">/10g</span>`;
    if ($('dashSilverRate')) $('dashSilverRate').innerHTML = `₹${silverBase.toLocaleString('en-IN')}<span class="text-[10px] text-slate-500">/kg</span>`;
    if ($('catGoldDisplay')) $('catGoldDisplay').innerText = `₹${goldBase.toLocaleString('en-IN')}/10g`;
    if ($('catSilverDisplay')) $('catSilverDisplay').innerText = `₹${silverBase.toLocaleString('en-IN')}/kg`;

    autoCalculateProductPrice();
    if ($('purBox')) buildRates();
}

async function saveMetalRates() {
    if (!isOwner) return;
    const goldBase = parseFloat($('baseGoldRateInput').value) || 0;
    const silverBase = parseFloat($('baseSilverRateInput').value) || 0;

    const { error } = await supabaseClient
        .from('store_settings')
        .update({ gold_rate_24k: goldBase, silver_rate_kg: silverBase, extra: S.extra })
        .eq('id', currentStoreId);

    if (error) {
        alertBox('Error saving rates!');
        return;
    }
    recalculateMetalRates();
    applyExtra();
    switchScreen('dashboardScreen');
    alertBox('Metal Rates Updated!');
}

function autoCalculateProductPrice() {
    if (!$('prodMetalType')) return;
    const metalType = $('prodMetalType').value;
    const purity = $('prodPurity').value;
    const weight = parseFloat($('prodWeight').value) || 0;

    let price = 0;
    if (metalType === 'gold') {
        const goldBase = parseFloat($('baseGoldRateInput').value) || 0;
        let purityFactor = (S.extra?.gold?.[purity] || 91.67) / 100;
        price = Math.round((goldBase / 10) * purityFactor * weight);
    } else {
        const silverBase = parseFloat($('baseSilverRateInput').value) || 0;
        price = Math.round((silverBase / 1000) * weight);
    }

    $('prodAutoPrice').value = `₹${price.toLocaleString('en-IN')}`;
}

/* ==========================================
   14. EXCEL LEDGER & FINANCIAL CALCULATOR
   ========================================== */
function renderLedgerRowUI(entry, rowCount) {
    const tbody = $('ledgerTableBody');
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-100 hover:bg-slate-50";
    tr.dataset.id = entry.id;
    tr.innerHTML = `
        <td class="p-2 border-r border-slate-200 text-center font-medium text-slate-500 row-index">${rowCount}</td>
        <td class="p-2 border-r border-slate-200"><input type="date" value="${entry.entry_date}" onchange="updateLedgerEntry(${entry.id}, this)" class="w-full bg-transparent border-none text-xs focus:outline-none date-input"></td>
        <td class="p-2 border-r border-slate-200"><input type="text" value="${entry.particulars || ''}" onchange="updateLedgerEntry(${entry.id}, this)" class="w-full bg-transparent border-none text-xs focus:outline-none part-input" placeholder="Item/Name"></td>
        <td class="p-2 border-r border-slate-200"><input type="number" value="${entry.debit || 0}" oninput="calculateLedgerTotals()" onchange="updateLedgerEntry(${entry.id}, this)" class="w-full bg-transparent border-none text-xs focus:outline-none debit-input text-rose-600 font-semibold"></td>
        <td class="p-2 border-r border-slate-200"><input type="number" value="${entry.credit || 0}" oninput="calculateLedgerTotals()" onchange="updateLedgerEntry(${entry.id}, this)" class="w-full bg-transparent border-none text-xs focus:outline-none credit-input font-bold text-emerald-600"></td>
        <td class="p-2 text-center"><button onclick="deleteLedgerRow(${entry.id}, this)" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash-can"></i></button></td>
    `;
    tbody.appendChild(tr);
}

async function addNewLedgerRow() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
        .from('ledger_entries')
        .insert([{ store_id: currentStoreId, entry_date: today, particulars: '', debit: 0, credit: 0 }])
        .select()
        .single();

    if (error) return alertBox('Error adding row!');

    const tbody = $('ledgerTableBody');
    renderLedgerRowUI(data, tbody.rows.length + 1);
    calculateLedgerTotals();
}

async function updateLedgerEntry(id, inputEl) {
    const tr = inputEl.closest('tr');
    const entry_date = tr.querySelector('.date-input').value;
    const particulars = tr.querySelector('.part-input').value;
    const debit = parseFloat(tr.querySelector('.debit-input').value) || 0;
    const credit = parseFloat(tr.querySelector('.credit-input').value) || 0;

    await supabaseClient
        .from('ledger_entries')
        .update({ entry_date, particulars, debit, credit })
        .eq('id', id);
}

async function deleteLedgerRow(id, btn) {
    await supabaseClient.from('ledger_entries').delete().eq('id', id);
    btn.closest('tr').remove();
    const rows = document.querySelectorAll('#ledgerTableBody tr');
    rows.forEach((row, idx) => {
        const indexCell = row.querySelector('.row-index');
        if (indexCell) indexCell.innerText = idx + 1;
    });
    calculateLedgerTotals();
}

function calculateLedgerTotals() {
    const debits = document.querySelectorAll('.debit-input');
    const credits = document.querySelectorAll('.credit-input');

    let totalDebit = 0;
    let totalCredit = 0;

    debits.forEach(input => totalDebit += parseFloat(input.value) || 0);
    credits.forEach(input => totalCredit += parseFloat(input.value) || 0);

    const balance = totalCredit - totalDebit;
    const balanceEl = $('totalLedgerBalance');
    if (balanceEl) {
        balanceEl.innerText = `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function calcAppend(val) {
    calcExpression += val;
    $('calcDisplay').innerText = calcExpression;
}

function calcClear() {
    calcExpression = "";
    $('calcDisplay').innerText = "0";
}

function calcBack() {
    calcExpression = calcExpression.slice(0, -1);
    $('calcDisplay').innerText = calcExpression || "0";
}

function calcCompute() {
    try {
        if (!calcExpression) return;
        calcExpression = String(eval(calcExpression));
        $('calcDisplay').innerText = calcExpression;
    } catch (e) {
        $('calcDisplay').innerText = "Error";
        calcExpression = "";
    }
}

/* ==========================================
   15. LIGHTBOX, CART, PRODUCT DETAILS, QR & SETTINGS
   ========================================== */
const storeBlock = () => `*${S.name}*\n${S.owner}\n${S.mobile}\n${S.address}`;
const catMsg = () => `*Visit our catalogue to see the latest products.*\n\n${catLink()}\n\n${storeBlock()}`;
const prodMsg = p => `I am interested in this product. Code: ${pcode(p)}, Name: ${p.name}, Price: ${p.price}, Link: ${prodLink(p.id)}`;
const inqMsg = p => `Hello ${S.name},\n\nI'm interested in this product:\n\n*${p.category || 'Product'}*\nCode: ${pcode(p)}\nName: ${p.name}\n${p.size ? 'Size: ' + p.size + '\n' : ''}Weight: ${p.weight}g\nPrice: ${p.price}\n\nLink: ${prodLink(p.id)}\n\nPlease provide more details.`;

function modal(html) {
    let m = $('uiModal');
    if (!m) {
        m = document.createElement('div');
        m.id = 'uiModal';
        m.className = 'ov hidden fixed inset-0 z-[70] bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4';
        m.onclick = e => { if (e.target === m) m.classList.add('hidden'); };
        document.body.appendChild(m);
    }
    m.innerHTML = `<div class="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[90vh] overflow-y-auto space-y-3">${html}</div>`;
    m.classList.remove('hidden');
}
const closeUI = () => $('uiModal') && $('uiModal').classList.add('hidden');
const INP = 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs';
const BTN = 'bg-[#d4af37] text-white w-full font-bold py-3 rounded-xl shadow text-xs';

function openImg(src) {
    let l = $('lightbox');
    if (!l) {
        l = document.createElement('div');
        l.id = 'lightbox';
        l.className = 'ov hidden fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-3';
        l.onclick = () => l.classList.add('hidden');
        document.body.appendChild(l);
    }
    l.innerHTML = `<button class="absolute top-4 right-4 text-white text-3xl"><i class="fa-solid fa-xmark"></i></button><img src="${src}" class="max-w-full max-h-full object-contain">`;
    l.classList.remove('hidden');
}

function shareSheet(t, id) {
    const p = t === 'p' ? productsList.find(x => x.id == id) : null;
    window._sh = { text: p ? prodMsg(p) : catMsg(), link: p ? prodLink(p.id) : catLink(), title: p ? p.name : S.name };
    const o = [
        ['fa-brands fa-whatsapp', '#25D366', 'WhatsApp'],
        ['fa-solid fa-link', '#d4af37', 'Copy Link'],
        ['fa-brands fa-telegram', '#229ED9', 'Telegram'],
        ['fa-brands fa-facebook-f', '#1877F2', 'Facebook'],
        ['fa-solid fa-envelope', '#ea4335', 'Email'],
        ['fa-solid fa-ellipsis', '#0f172a', 'More']
    ];
    modal(`
        <div class="flex justify-between items-center">
            <h3 class="font-bold text-sm">Share ${p ? 'Product' : 'Store Catalogue'}</h3>
            <button onclick="closeUI()" class="text-slate-400"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="flex items-center space-x-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
            <input type="text" readonly value="${window._sh.link}" class="w-full bg-transparent text-[11px] text-slate-700 focus:outline-none truncate">
            <button onclick="navigator.clipboard.writeText('${window._sh.link}').then(()=>alertBox('Link Copied!'))" class="bg-[#d4af37] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0">Copy Link</button>
        </div>
        <div class="grid grid-cols-3 gap-4 text-center text-xs pt-2">
            ${o.map((x, i) => `<button onclick="shareTo(${i})"><span class="w-11 h-11 mx-auto rounded-full flex items-center justify-center text-white text-lg" style="background:${x[1]}"><i class="${x[0]}"></i></span><span class="block mt-1 font-medium">${x[2]}</span></button>`).join('')}
        </div>
    `);
}

function shareTo(i) {
    const { text, link, title } = window._sh, e = encodeURIComponent;
    if (i == 0) wa('', text);
    else if (i == 1) navigator.clipboard.writeText(link).then(() => alertBox('Link copied!'));
    else if (i == 2) window.open('https://t.me/share/url?url=' + e(link) + '&text=' + e(text), '_blank');
    else if (i == 3) window.open('https://www.facebook.com/sharer/sharer.php?u=' + e(link), '_blank');
    else if (i == 4) location.href = 'mailto:?subject=' + e(title) + '&body=' + e(text);
    else if (navigator.share) navigator.share({ title, text, url: link });
    else alertBox('Share not supported');
    closeUI();
}

const enquire = id => { const p = productsList.find(x => x.id == id); if (p) wa(ownerNo(), inqMsg(p)); };

function wireExtraControls() {
    const hdr = $('viewCatalogueScreen')?.firstElementChild;
    const rightGroup = hdr?.lastElementChild;
    if (rightGroup && !$('cartBadge')) {
        rightGroup.insertAdjacentHTML('afterbegin', `<button onclick="openCart()" class="relative bg-white/20 p-2 rounded-full text-white text-xs hover:bg-white/30 transition" title="Cart"><i class="fa-solid fa-cart-shopping"></i><span id="cartBadge" class="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] rounded-full px-1 hidden">0</span></button>`);
    }

    const o = (s, f) => { const e = document.querySelector(s); if (e) e.onclick = f; };
    o('#contentCatalogue [onclick*="Store QR"]', openQR);

    const custTiles = document.querySelectorAll('#contentCustomers .grid > div');
    if (custTiles[0]) {
        custTiles[0].onclick = () => listCustomers(false);
        custTiles[1].onclick = addCustomerForm;
        custTiles[2].onclick = () => listCustomers(true);
    }

    const ub = document.querySelector('#addProductScreen button[onclick*="saveAndUploadProduct"]');
    if (ub && !$('prodDescInput')) {
        ub.insertAdjacentHTML('beforebegin', `<div class="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xs font-bold text-amber-700 tracking-wider">EXTRA DETAILS</h2><input id="prodLocInput" placeholder="Address / Location (optional)" class="${INP}"><textarea id="prodDescInput" rows="2" placeholder="Product Description (optional)" class="${INP}"></textarea></div>`);
    }
}

function openProduct(id) {
    const p = productsList.find(x => x.id == id);
    if (!p) return;
    let s = $('productDetailScreen');
    if (!s) {
        s = document.createElement('div');
        s.id = 'productDetailScreen';
        s.className = 'hidden flex flex-col bg-slate-50 overflow-y-auto pb-24 absolute inset-0 z-[45]';
        $('appMainContainer').appendChild(s);
    }
    const im = p.images && p.images.length ? p.images : [IMG], v = S.extra.view;
    const chip = t => `<span class="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">${t}</span>`;
    const body = isOwner ? `
      <label class="text-xs font-bold block">Product Name</label><input id="pd_name" value="${q(p.name)}" class="${INP}">
      <label class="text-xs font-bold block">Category</label><select id="pd_cat" class="${INP}">${categoriesList.map(c => `<option value="${q(c.name)}" ${c.name === p.category ? 'selected' : ''}>${q(c.name)}</option>`).join('')}</select>
      <label class="text-xs font-bold block">Price</label><input id="pd_price" value="${q(p.price)}" class="${INP}">
      <label class="text-xs font-bold block">Address / Location</label><input id="pd_loc" value="${q(p.location)}" class="${INP}">
      <label class="text-xs font-bold block">Description</label><textarea id="pd_desc" rows="3" class="${INP}">${q(p.description)}</textarea>
      <div class="flex gap-2"><button onclick="saveProd(${p.id})" class="${BTN}"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button><button onclick="delProd(${p.id})" class="bg-rose-600 text-white font-bold px-5 rounded-xl"><i class="fa-solid fa-trash-can"></i></button></div>`
        : `<h2 class="text-lg font-bold">${q(p.name)}</h2>
      ${v.price ? `<p class="text-xl font-bold text-amber-700">${q(p.price)}</p>` : ''}
      <div class="flex flex-wrap gap-2">${v.code ? chip(pcode(p)) : ''}${v.category ? chip(q(p.category)) : ''}${v.weight ? chip(p.weight + 'g') : ''}${p.size ? chip('Size: ' + q(p.size)) : ''}${p.purity ? chip(q((p.metal_type || '') + ' ' + p.purity)) : ''}</div>
      ${p.description ? `<p class="text-xs text-slate-600">${q(p.description)}</p>` : ''}
      ${p.location ? `<p class="text-xs text-rose-600"><i class="fa-solid fa-location-dot"></i> ${q(p.location)}</p>` : ''}`;
    s.innerHTML = `
    <div class="bg-[#d4af37] text-white px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-20 flex-shrink-0">
      <div class="flex items-center gap-3 min-w-0"><button onclick="switchScreen('viewCatalogueScreen')" class="text-xl"><i class="fa-solid fa-arrow-left"></i></button><h1 class="font-bold truncate text-sm">${q(S.name)}</h1></div>
      <div class="flex gap-3 text-base"><button onclick="openCart()"><i class="fa-solid fa-cart-shopping"></i></button><button onclick="shareSheet('p',${p.id})"><i class="fa-solid fa-share-nodes"></i></button></div>
    </div>
    <div class="p-4 space-y-4">
      <div><img id="pdMain" src="${im[0]}" onclick="openImg(this.src)" class="w-full max-h-72 object-contain bg-white rounded-2xl border cursor-zoom-in">
        <div class="flex gap-2 mt-2 overflow-x-auto">${im.map(u => `<img src="${u}" onclick="document.getElementById('pdMain').src='${u}'" class="w-14 h-14 rounded-xl object-cover border cursor-pointer">`).join('')}</div></div>
      <div class="space-y-3">${body}
        <div class="flex gap-2 pt-2"><button onclick="addCart(${p.id})" class="flex-1 border-2 border-slate-800 font-bold py-3 rounded-xl text-xs"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>
        <button onclick="enquire(${p.id})" class="${BTN} flex-1"><i class="fa-brands fa-whatsapp"></i> Enquiry</button></div></div>
    </div>`;
    switchScreen('productDetailScreen');
}

async function saveProd(id) {
    const g = k => $('pd_' + k).value.trim(), pr = g('price');
    const u = { name: g('name'), category: $('pd_cat').value, price: pr.startsWith('₹') ? pr : '₹' + pr, description: g('desc'), location: g('loc') };
    const { error } = await supabaseClient.from('products').update(u).eq('id', id);
    if (error) return alertBox('Error saving product!');
    Object.assign(productsList.find(x => x.id == id), u);
    renderCatalogueProducts(_cat);
    renderGroupsAndCategories();
    alertBox('Product Updated!');
}

async function delProd(id) {
    if (!confirm('Delete this product?')) return;
    await deleteProductFromSupabase(id);
    switchScreen('viewCatalogueScreen');
}


/* ---------- Cart ---------- */
function saveCart() { 
    localStorage.setItem('cart', JSON.stringify(cart)); 
    updateCartBadge(); 
}

function addCart(id) { 
    const c = cart.find(x => x.id == id); 
    c ? c.q++ : cart.push({ id, q: 1 }); 
    saveCart(); 
    alertBox('Added to Cart'); 
}

function cartRows() { 
    // सिर्फ वही आइटम्स रखें जो current store की productsList में सच में मौजूद हैं
    const validRows = cart
        .map(c => ({ p: productsList.find(x => x.id == c.id), q: c.q }))
        .filter(r => r.p);
    
    // अगर कोई डिलीटेड प्रोडक्ट मिला, तो उसे cart और localStorage से तुरंत साफ़ करें
    if (validRows.length !== cart.length) {
        cart = validRows.map(r => ({ id: r.p.id, q: r.q }));
        localStorage.setItem('cart', JSON.stringify(cart));
    }
    return validRows; 
}

function updateCartBadge() { 
    const validRows = cartRows();
    const n = validRows.reduce((a, r) => a + r.q, 0); 
    const b = $('cartBadge'); 
    if (b) { 
        b.textContent = n; 
        b.classList.toggle('hidden', n === 0); 
    } 
}

function chQ(id, d) { 
    const c = cart.find(x => x.id == id); 
    if (c) {
        c.q += d; 
        if (c.q < 1) cart = cart.filter(x => x.id != id); 
    }
    saveCart(); 
    openCart(); 
}

function openCart() {
    const rows = cartRows();
    const total = rows.reduce((a, r) => a + pnum(r.p) * r.q, 0);
    
    modal(`<h3 class="font-bold text-base">Your Cart</h3>` + 
        (rows.length ? rows.map(r => `
            <div class="flex items-center gap-3">
                <img src="${pimg(r.p)}" class="w-12 h-12 rounded-xl object-cover">
                <div class="flex-1 text-xs"><b>${q(r.p.name)}</b><br>${q(r.p.price)}</div>
                <button onclick="chQ(${r.p.id},-1)" class="w-7 h-7 border rounded-full">−</button>
                <b>${r.q}</b>
                <button onclick="chQ(${r.p.id},1)" class="w-7 h-7 border rounded-full">+</button>
            </div>`).join('')
        + `<div class="font-bold text-right text-sm">Total: ₹${total.toLocaleString('en-IN')}</div>
           <button onclick="sendOrder()" class="${BTN}"><i class="fa-brands fa-whatsapp"></i> Send Inquiry / Order</button>` 
        : '<p class="text-xs text-slate-500">Cart is empty.</p>'));
}

function sendOrder() {
    const rows = cartRows();
    let t = `Hello ${S.name},\n\nI want to inquire/order these products:\n\n`, total = 0;
    rows.forEach((r, i) => { 
        total += pnum(r.p) * r.q; 
        t += `${i + 1}. *${r.p.name}*\nCode: ${pcode(r.p)} | Qty: ${r.q} | Price: ${r.p.price}\nLink: ${prodLink(r.p.id)}\n\n`; 
    });
    t += `Total: ₹${total.toLocaleString('en-IN')}\n\nPlease provide more details.`;
    wa(ownerNo(), t);
}



/* ---------- QR Code ---------- */
function openQR() {
    modal(`<h3 class="font-bold text-base">Store QR Code</h3>
    <input id="qrOwner" value="${q(S.owner)}" placeholder="Owner Name" class="${INP}" oninput="makeQR()">
    <input id="qrLink" value="${catLink()}" placeholder="Catalogue Website Link" class="${INP}" oninput="makeQR()">
    <p id="qrCap" class="text-center font-bold text-xs"></p><div id="qrBox" class="flex justify-center p-2"></div>
    <button onclick="dlQR()" class="${BTN}"><i class="fa-solid fa-download"></i> Download QR</button>`);
    makeQR();
}
function makeQR() {
    const b = $('qrBox');
    b.innerHTML = '';
    $('qrCap').textContent = S.name + ($('qrOwner').value ? ' • ' + $('qrOwner').value : '');
    new QRCode(b, { text: $('qrLink').value || catLink(), width: 200, height: 200 });
}
function dlQR() {
    const c = $('qrBox').querySelector('canvas'), o = document.createElement('canvas');
    o.width = 300; o.height = 360;
    const x = o.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 360);
    x.fillStyle = '#000'; x.textAlign = 'center';
    x.font = 'bold 18px sans-serif'; x.fillText(S.name, 150, 28);
    x.font = '14px sans-serif'; x.fillText($('qrOwner').value, 150, 50);
    x.drawImage(c, 40, 70, 220, 220);
    x.fillText('Scan to view our catalogue', 150, 325);
    const a = document.createElement('a');
    a.download = 'store-qr.png';
    a.href = o.toDataURL();
    a.click();
}

/* ---------- Customers ---------- */
async function loadCustomers() {
    const { data } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('store_id', currentStoreId)
        .order('id', { ascending: false });
        
    customers = data || [];
    const b = document.querySelector('#contentCustomers .grid > div span');
    if (b) b.textContent = customers.length;
    const rc = document.querySelector('#contentCustomers .bg-white.p-4 p');
    if (rc) rc.innerHTML = customers.length ? customers.slice(0, 5).map(c => `${q(c.name)} - ${q(c.mobile)}`).join('<br>') : 'No recent customer interactions found. Start by adding a customer above.';
}



   
function addCustomerForm() {
    modal(`<h3 class="font-bold text-base">Add Customer</h3><input id="cuName" placeholder="Customer Name" class="${INP}"><input id="cuMob" type="tel" placeholder="Mobile Number" class="${INP}"><input id="cuAddr" placeholder="Address" class="${INP}"><button onclick="saveCustomer()" class="${BTN}">Save Customer</button>`);
}
async function saveCustomer() {
    const c = { store_id: currentStoreId, name: $('cuName').value.trim(), mobile: $('cuMob').value.trim(), address: $('cuAddr').value.trim() };
    if (!c.name || !c.mobile) return alertBox('Name & mobile required');
    const { error } = await supabaseClient.from('customers').insert([c]);
    if (error) return alertBox('Error saving customer!');
    closeUI();
    await loadCustomers();
    alertBox('Customer Saved!');
}
function listCustomers(msg) {
    modal(`<h3 class="font-bold text-base">${msg === true ? 'Send Message' : 'All Customers'}</h3>` + (customers.length ? customers.map(c => `<div class="flex items-center gap-2 border-b pb-2 text-xs"><div class="flex-1"><b>${q(c.name)}</b><br>${q(c.mobile)}<br><span class="text-slate-400">${q(c.address)}</span></div>
      <a href="tel:${q(c.mobile)}" class="p-2 text-blue-600"><i class="fa-solid fa-phone"></i></a><button onclick="wa('${q(c.mobile)}',catMsg())" class="p-2 text-emerald-600"><i class="fa-brands fa-whatsapp"></i></button>
      <button onclick="delCustomer(${c.id})" class="p-2 text-rose-500"><i class="fa-solid fa-trash-can"></i></button></div>`).join('') : '<p class="text-xs text-slate-500">No customers yet.</p>'));
}
async function delCustomer(id) {
    if (!confirm('Delete customer?')) return;
    await supabaseClient.from('customers').delete().eq('id', id);
    await loadCustomers();
    listCustomers(false);
}

/* ---------- Settings Screen & Extra Config ---------- */
async function saveExtra() {
    if (!isOwner) return;
    const { error } = await supabaseClient.from('store_settings').update({ extra: S.extra }).eq('id', currentStoreId);
    if (error) alertBox('Error saving settings!');
    else alertBox('Settings Saved!');
    applyExtra();
}

function applyExtra() {
    document.documentElement.style.setProperty('--theme', S.extra.theme);
    renderCatalogueProducts(_cat);
    updateSlideshowWithProducts();
}

function settingsScreen() {
    let s = $('settingsScreen');
    if (!s) return;
    const grp = (t, a) => `<p class="text-xs font-bold text-slate-500 px-1 pt-3">${t}</p><div class="bg-white rounded-2xl shadow-sm divide-y">${a.map(x => `<div onclick="${x[3]}" class="flex items-center gap-3 p-4 cursor-pointer hover:bg-amber-50"><span class="text-xl">${x[0]}</span><div class="flex-1"><b class="text-xs">${x[1]}</b><p class="text-[11px] text-slate-500">${x[2]}</p></div><i class="fa-solid fa-chevron-right text-slate-400 text-xs"></i></div>`).join('')}</div>`;
    s.innerHTML = `<div class="bg-[#d4af37] text-white px-4 py-3.5 flex items-center gap-3 shadow-md sticky top-0 z-20 flex-shrink-0"><button onclick="switchScreen('dashboardScreen')" class="text-xl"><i class="fa-solid fa-arrow-left"></i></button><h1 class="text-base font-bold">Settings</h1></div>
    <div class="p-4 space-y-2 pb-16">`
        + grp('ACCOUNT', [
            ['👤', 'Store Profile & Edit', 'View store profile & edit details', "openMyProfileFromMenu()"],
            ['🔗', 'Share & Copy Store Link', 'Share your store link with customers', 'openShareModal()']
        ])
        + grp('CATALOGUE', [
            ['📋', 'Product View Settings', 'Control what shows on product cards', 'viewSheet()'],
            ['📂', 'Manage Categories', 'Add, edit and delete categories', "switchScreen('categoriesScreen')"],
            ['🎨', 'Theme Colors', 'Customize your catalogue appearance', 'themeSheet()'],
            ['📺', 'Slideshow Settings', 'Banner slideshow configuration', 'sliderSheet()'],
            ['💰', 'Metal Rates', 'Live rates & purities', "switchScreen('metalRatesScreen')"]
        ]) + '</div>';
    switchScreen('settingsScreen');
}

function viewSheet() {
    modal('<h3 class="font-bold text-base">Product View Settings</h3>' + ['price', 'weight', 'category', 'code'].map(k => `<label class="flex justify-between py-2 capitalize text-xs">Show ${k}<input type="checkbox" ${S.extra.view[k] ? 'checked' : ''} onchange="S.extra.view.${k}=this.checked;saveExtra()"></label>`).join(''));
}

function themeSheet() {
    const cols = ['#d4af37', '#b91c1c', '#047857', '#1d4ed8', '#7c3aed', '#be185d', '#0f172a', '#ea580c'];
    modal(`<h3 class="font-bold text-base">Theme Colors</h3><div class="flex flex-wrap gap-3">${cols.map(c => `<button onclick="setTheme('${c}')" style="background:${c}" class="w-10 h-10 rounded-full border-2 border-white shadow"></button>`).join('')}</div><label class="flex items-center justify-between text-xs pt-2">Custom colour <input type="color" value="${S.extra.theme}" onchange="setTheme(this.value)"></label>`);
}

function setTheme(c) { S.extra.theme = c; saveExtra(); }

function sliderSheet() {
    modal(`<h3 class="font-bold text-base">Slideshow Settings</h3><label class="flex justify-between text-xs">Show banner slideshow<input type="checkbox" ${S.extra.slider.on ? 'checked' : ''} onchange="S.extra.slider.on=this.checked;saveExtra()"></label><label class="flex items-center justify-between items-center text-xs pt-2">Seconds per slide<input type="number" min="1" max="20" value="${S.extra.slider.sec}" class="w-20 border rounded-lg p-1 text-center" onchange="S.extra.slider.sec=Math.max(1,+this.value||3);saveExtra();startHeroSlideshow()"></label>`);
}

function buildRates() {
    const sc = $('metalRatesScreen')?.lastElementChild;
    if (!sc) return;
    let b = $('purBox');
    if (!b) {
        b = document.createElement('div');
        b.id = 'purBox';
        b.className = 'space-y-4';
        sc.insertBefore(b, sc.lastElementChild);
    }
    const g = +$('baseGoldRateInput')?.value || 0, s = +$('baseSilverRateInput')?.value || 0, e = S.extra;
    const tbl = (t, obj, base, k) => `<div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xs font-bold text-amber-700 mb-1">${t}</h2>` + Object.entries(obj).map(([n, pc]) => `<div class="flex items-center justify-between py-2 border-b text-xs"><b class="w-24 text-amber-600">${n}</b><span><input type="number" step="0.01" value="${pc}" onchange="setPur('${k}','${n}',this.value)" class="w-16 border rounded-lg text-center p-1"> %</span><b>₹${Math.round(base * pc / 100).toLocaleString('en-IN')}</b></div>`).join('') + '</div>';
    b.innerHTML = tbl('GOLD PURITIES (per 10g)', e.gold, g, 'gold') + tbl('SILVER PURITIES (per kg)', e.silver, s, 'silver');
}

function setPur(k, n, v) { S.extra[k][n] = parseFloat(v) || 0; buildRates(); }

// Step 1: Email par OTP bhejne ke liye
async function sendOtpCode() {
    const email = document.getElementById('authUsernameInput').value.trim();
    if (!email || !email.includes('@')) {
        return alertBox('Kripya ek valid email address enter karein.');
    }

    const { error } = await supabaseClient.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: true }
    });

    if (error) {
        return alertBox('OTP bhejne mein error aayi: ' + error.message);
    }

    // Email step chhupayein aur OTP step dikhayein
    document.getElementById('emailStep').classList.add('hidden');
    document.getElementById('otpStep').classList.remove('hidden');
    alertBox('OTP aapke email par bhej diya gaya hai!');
}

// Back button agar email change karni ho
function backToEmailStep() {
    document.getElementById('otpStep').classList.add('hidden');
    document.getElementById('emailStep').classList.remove('hidden');
}

// Step 2: OTP Verify karne aur store banane ke liye
async function verifyOtpAndRegister() {
    const email = document.getElementById('authUsernameInput').value.trim();
    const token = document.getElementById('authOtpInput').value.trim();

    if (!token || token.length < 6) {
        return alertBox('Kripya pura 6-digit OTP enter karein.');
    }

    const { data, error } = await supabaseClient.auth.verifyOtp({
        email: email,
        token: token,
        type: 'email'
    });

    if (error || !data.user) {
        return alertBox('Galat OTP ya verification fail ho gaya: ' + (error?.message || 'Unknown error'));
    }

    const userUUID = data.user.id;
    const storeName = document.getElementById('authStoreNameInput') ? document.getElementById('authStoreNameInput').value.trim() : "My Store";
    const ownerName = document.getElementById('authOwnerNameInput') ? document.getElementById('authOwnerNameInput').value.trim() : "Owner";
    const mobile = document.getElementById('authMobileInput') ? document.getElementById('authMobileInput').value.trim() : "";

    if (authMode === 'signup') {
        const newStorePayload = {
            user_id: userUUID,
            store_name: storeName,
            owner_name: ownerName,
            mobile: mobile,
            whatsapp: mobile,
            email: email, // Yahi email database mein user ka email ban jayega
            username: email,
            address: 'Not Provided',
            gold_rate_24k: 75000,
            silver_rate_kg: 90000,
            updated_at: new Date().toISOString()
        };

        const { data: insertedStore, error: storeErr } = await supabaseClient
            .from('store_settings')
            .insert([newStorePayload])
            .select()
            .maybeSingle();

        if (storeErr && !storeErr.message.includes('duplicate')) {
            console.error("Store Insert Error:", storeErr);
        }
    }

    // Fetch store id
    const { data: storeData } = await supabaseClient
        .from('store_settings')
        .select('id')
        .eq('user_id', userUUID)
        .maybeSingle();

    const storeIdToUse = storeData ? storeData.id : 1;

    loggedInStoreId = storeIdToUse;
    currentStoreId = storeIdToUse;
    isOwner = true;
    localStorage.setItem('ubc_owner_session', JSON.stringify({
        store_id: storeIdToUse,
        user_id: userUUID,
        username: email
    }));

    closeModals();
    window.history.replaceState({}, '', `${BASE()}?store=${currentStoreId}`);
    await loadAllDataFromSupabase();
    switchScreen('dashboardScreen');
    alertBox('Login successful! Email verified.');
           }






