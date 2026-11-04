/* ==========================================
   0. SUPABASE CONFIGURATION
   ========================================== */
// Yahan apna Supabase URL aur Anon Key paste karein:
const SUPABASE_URL = 'https://hbsvhyiasgpuwxbkytkd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_D9T2ML4EXmx1mdu6qwkMVQ_WU49_Z6M';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================
   1. APPLICATION STATE (DATA STORAGE)
   ========================================== */
let productsList = [];
let groupsList = [];
let categoriesList = [];
let uploadedImagesList = [];
let calcExpression = "";

let storeLogoData = null;
let ownerPhotoData = null;
let storeBannerData = null;

/* ==========================================
   2. INITIALIZATION ON PAGE LOAD (FETCH FROM SUPABASE)
   ========================================== */
window.addEventListener('DOMContentLoaded', async () => {
    await loadAllDataFromSupabase();
});

async function loadAllDataFromSupabase() {
    try {
        // 1. Store Settings & Metal Rates Load Karein
        const { data: settings } = await supabaseClient
            .from('store_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (settings) {
            // Inputs aur UI update karein
            document.getElementById('inputStoreName').value = settings.store_name !== 'Your Store Name' ? settings.store_name : '';
            document.getElementById('inputOwnerName').value = settings.owner_name !== 'Not Provided' ? settings.owner_name : '';
            document.getElementById('inputMobile').value = settings.mobile !== 'Not Provided' ? settings.mobile : '';
            document.getElementById('inputEmail').value = settings.email !== 'Not Provided' ? settings.email : '';
            document.getElementById('inputAddress').value = settings.address !== 'Not Provided' ? settings.address : '';

            document.getElementById('headerStoreName').innerText = settings.store_name;
            document.getElementById('profileStoreName').innerText = settings.store_name;
            document.getElementById('catStoreName').innerText = settings.store_name;
            document.title = settings.store_name;

            document.getElementById('profileOwnerName').innerText = settings.owner_name;
            document.getElementById('profileMobile').innerText = settings.mobile;
            document.getElementById('profileWhatsapp').innerText = settings.whatsapp;
            document.getElementById('profileEmail').innerText = settings.email;
            document.getElementById('profileStoreAddress').innerText = settings.address;

            document.getElementById('sidebarMobileDisplay').innerText = settings.mobile !== "Not Provided" ? settings.mobile : "Add Mobile No.";
            document.getElementById('sidebarEmailDisplay').innerText = settings.email !== "Not Provided" ? settings.email : "Add Email in Profile";

            if (settings.logo_url) {
                document.getElementById('storeLogoPreview').src = settings.logo_url;
                document.getElementById('storeProfileAvatar').src = settings.logo_url;
                document.getElementById('catStoreLogo').src = settings.logo_url;
            }
            if (settings.owner_photo_url) {
                document.getElementById('ownerPhotoPreview').src = settings.owner_photo_url;
            }
            if (settings.banner_url) {
                document.getElementById('storePhotoPreview').src = settings.banner_url;
                document.getElementById('profileBannerImg').src = settings.banner_url;
            }

            // Metal Rates Set Karein
            document.getElementById('baseGoldRateInput').value = settings.gold_rate_24k || '';
            document.getElementById('baseSilverRateInput').value = settings.silver_rate_kg || '';
            recalculateMetalRates();
        }

        // 2. Groups Load Karein
        const { data: groups } = await supabaseClient.from('groups').select('*').order('id');
        if (groups) groupsList = groups;

        // 3. Categories Load Karein
        const { data: categories } = await supabaseClient.from('categories').select('*').order('id');
        if (categories) categoriesList = categories;

        // 4. Products Load Karein
        const { data: products } = await supabaseClient.from('products').select('*').order('id', { ascending: false });
        if (products) {
            productsList = products;
            document.getElementById('dashProdCountBadge').innerText = productsList.length;
            document.getElementById('profileTotalProdCount').innerText = productsList.length;
        }

        // 5. Finance Ledger Load Karein
        const { data: ledger } = await supabaseClient.from('ledger_entries').select('*').order('id');
        if (ledger) {
            const tbody = document.getElementById('ledgerTableBody');
            tbody.innerHTML = '';
            ledger.forEach((entry, idx) => renderLedgerRowUI(entry, idx + 1));
            calculateLedgerTotals();
        }

        renderGroupsAndCategories();
        renderCatalogueCategories();
        renderCatalogueProducts();

    } catch (err) {
        console.error("Supabase data load error:", err);
    }
}

/* ==========================================
   3. NAVIGATION & TAB SWITCHING
   ========================================== */
function switchTab(tabName) {
    const catTab = document.getElementById('tabCatalogue');
    const custTab = document.getElementById('tabCustomers');
    const finTab = document.getElementById('tabFinance');

    const catContent = document.getElementById('contentCatalogue');
    const custContent = document.getElementById('contentCustomers');
    const finContent = document.getElementById('contentFinance');

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
    const allScreens = [
        'addProductScreen',
        'editProfileScreen',
        'categoriesScreen',
        'metalRatesScreen',
        'viewCatalogueScreen',
        'storeProfileScreen'
    ];

    allScreens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
        target.scrollTop = 0;
    }

    if (screenId === 'viewCatalogueScreen') {
        renderCatalogueProducts();
        renderCatalogueCategories();
    }
}

function toggleHamburgerMenu() {
    const sidebar = document.getElementById('hamburgerSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function menuAction(featureName) {
    toggleHamburgerMenu();
    if (featureName === 'My Profile') {
        switchScreen('editProfileScreen');
    } else if (featureName === 'View Catalogue') {
        switchScreen('viewCatalogueScreen');
    } else {
        alertBox(`Opening ${featureName}...`);
    }
}

function alertBox(message) {
    const banner = document.createElement('div');
    banner.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl z-50 transition-all';
    banner.innerText = message;
    document.body.appendChild(banner);
    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
    }, 2500);
}

/* ==========================================
   4. PROFILE MANAGEMENT (SUPABASE UPDATE)
   ========================================== */
async function saveProfileChanges() {
    const storeName = document.getElementById('inputStoreName').value.trim() || "Your Store Name";
    const ownerName = document.getElementById('inputOwnerName').value.trim() || "Not Provided";
    const mobile = document.getElementById('inputMobile').value.trim() || "Not Provided";
    const email = document.getElementById('inputEmail').value.trim() || "Not Provided";
    const address = document.getElementById('inputAddress').value.trim() || "Not Provided";

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
        .eq('id', 1);

    if (error) {
        console.error(error);
        alertBox('Error saving profile!');
        return;
    }

    document.getElementById('headerStoreName').innerText = storeName;
    document.getElementById('profileStoreName').innerText = storeName;
    document.getElementById('catStoreName').innerText = storeName;
    document.title = storeName;

    document.getElementById('profileOwnerName').innerText = ownerName;
    document.getElementById('profileMobile').innerText = mobile;
    document.getElementById('profileWhatsapp').innerText = mobile;
    document.getElementById('profileEmail').innerText = email;
    document.getElementById('profileStoreAddress').innerText = address;

    document.getElementById('sidebarMobileDisplay').innerText = mobile !== "Not Provided" ? mobile : "Add Mobile No.";
    document.getElementById('sidebarEmailDisplay').innerText = email !== "Not Provided" ? email : "Add Email in Profile";

    switchScreen('dashboardScreen');
    alertBox('Profile Saved to Supabase!');
}

function previewProfileImage(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imgUrl = e.target.result;
            document.getElementById(previewId).src = imgUrl;

            if (previewId === 'storeLogoPreview') {
                storeLogoData = imgUrl;
                document.getElementById('storeProfileAvatar').src = imgUrl;
                document.getElementById('catStoreLogo').src = imgUrl;
            }
            if (previewId === 'ownerPhotoPreview') {
                ownerPhotoData = imgUrl;
            }
            if (previewId === 'storePhotoPreview') {
                storeBannerData = imgUrl;
                document.getElementById('profileBannerImg').src = imgUrl;
            }
        };
        reader.readAsDataURL(file);
    }
}

/* ==========================================
   5. PRODUCT UPLOAD & CATALOGUE CRUD
   ========================================== */
function toggleCatalogueOptionsMenu() {
    const menu = document.getElementById('catalogueOptionsMenu');
    menu.classList.toggle('hidden');
}

window.addEventListener('click', function (e) {
    const menu = document.getElementById('catalogueOptionsMenu');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('.fa-ellipsis-vertical')) {
        menu.classList.add('hidden');
    }
});

function handleImageUpload(event) {
    const files = event.target.files;
    const container = document.getElementById('imagePreviewContainer');
    const countText = document.getElementById('imgCountText');

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
                countText.innerText = `${uploadedImagesList.length}/15`;
            };
            reader.readAsDataURL(files[i]);
        }
    }
}

// async function saveAndUploadProduct() {
//     const name = document.getElementById('prodNameInput').value.trim() || "Unnamed Product";
//     const category = document.getElementById('productCategorySelect').value || "Uncategorized";
//     const metal_type = document.getElementById('prodMetalType').value || "gold";
//     const purity = document.getElementById('prodPurity').value || "22K";
//     const size = document.getElementById('prodSize').value.trim() || "";
//     const weight = parseFloat(document.getElementById('prodWeight').value) || 0;
//     const price = document.getElementById('prodAutoPrice').value || "₹0";
//     const images = uploadedImagesList.length > 0 ? uploadedImagesList : ["https://placehold.co/300x300/d4af37/ffffff?text=Product"];

//     const { data, error } = await supabaseClient
//         .from('products')
//         .insert([{ name, category, metal_type, purity, size, weight, price, images }])
//         .select()
//         .single();

//     if (error) {
//         console.error(error);
//         alertBox('Error uploading product!');
//         return;
//     }

//     productsList.unshift(data);

//     document.getElementById('dashProdCountBadge').innerText = productsList.length;
//     document.getElementById('profileTotalProdCount').innerText = productsList.length;

//     uploadedImagesList = [];
//     document.getElementById('imagePreviewContainer').innerHTML = '';
//     document.getElementById('imagePreviewContainer').classList.add('hidden');
//     document.getElementById('prodNameInput').value = '';
//     document.getElementById('prodWeight').value = '';
//     document.getElementById('prodSize').value = '';
//     document.getElementById('prodAutoPrice').value = '₹0';
//     document.getElementById('imgCountText').innerText = '0/15';

//     renderGroupsAndCategories();
//     switchScreen('dashboardScreen');
//     alertBox('Product Uploaded to Supabase!');
// }

async function saveAndUploadProduct() {
    const name = document.getElementById('prodNameInput').value.trim() || "Unnamed Product";
    const category = document.getElementById('productCategorySelect').value || "Uncategorized";
    const metal_type = document.getElementById('prodMetalType').value || "gold";
    const purity = document.getElementById('prodPurity').value || "22K";
    const size = document.getElementById('prodSize').value.trim() || "";
    const weight = parseFloat(document.getElementById('prodWeight').value) || 0;
    const price = document.getElementById('prodAutoPrice').value || "₹0";

    let imageUrls = [];

    // 1. Agar user ne images select ki hain, toh unhe Supabase Bucket mein upload karein
    const fileInput = document.getElementById('productImageInput');
    if (fileInput.files && fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
            if (i >= 7) break; // Max 7 images
            const file = fileInput.files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${i}.${fileExt}`;
            const filePath = `${fileName}`;

            // Supabase Storage mein upload karna
            // Is tarah badlein:
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('IMAGE') // Yahan pehle product-images tha, ab IMAGE karein
                .upload(filePath, file);

            if (uploadError) {
                console.error("Image upload error:", uploadError);
                continue;
            }

            // Public URL nikalna
            const { data: publicURLData } = supabaseClient.storage
                .from('IMAGE') // Yahan pehle product-images tha, ab IMAGE karein
                .getPublicUrl(filePath);

            if (publicURLData) {
                imageUrls.push(publicURLData.publicUrl);
            }
        }
    }

    // Agar koi image select nahi ki toh default placeholder
    if (imageUrls.length === 0) {
        imageUrls.push("https://placehold.co/300x300/d4af37/ffffff?text=Product");
    }

    // 2. Database mein Product ka data save karna (Images ke public URL ke sath)
    const { data, error } = await supabaseClient
        .from('products')
        .insert([{
            name,
            category,
            metal_type,
            purity,
            size,
            weight,
            price,
            images: imageUrls
        }])
        .select()
        .single();

    if (error) {
        console.error(error);
        alertBox('Error uploading product!');
        return;
    }

    productsList.unshift(data);

    document.getElementById('dashProdCountBadge').innerText = productsList.length;
    document.getElementById('profileTotalProdCount').innerText = productsList.length;

    // Form reset karna
    uploadedImagesList = [];
    fileInput.value = '';
    document.getElementById('imagePreviewContainer').innerHTML = '';
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('prodNameInput').value = '';
    document.getElementById('prodWeight').value = '';
    document.getElementById('prodSize').value = '';
    document.getElementById('prodAutoPrice').value = '₹0';
    document.getElementById('imgCountText').innerText = '0/15';

    renderGroupsAndCategories();
    switchScreen('dashboardScreen');
    alertBox('Product & Images Uploaded to Bucket!');
}


async function deleteProductFromSupabase(id) {
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) {
        alertBox('Error deleting product!');
        return;
    }
    productsList = productsList.filter(p => p.id !== id);
    document.getElementById('dashProdCountBadge').innerText = productsList.length;
    document.getElementById('profileTotalProdCount').innerText = productsList.length;
    renderCatalogueProducts();
    renderGroupsAndCategories();
    alertBox('Product Deleted!');
}

function renderCatalogueProducts(filterCategory = null) {
    const area = document.getElementById('catalogueProductsArea');
    const filtered = filterCategory ? productsList.filter(p => p.category === filterCategory) : productsList;

    if (filtered.length === 0) {
        area.innerHTML = `
            <div id="noProductsPlaceholder" class="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div class="w-16 h-16 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center text-xl shadow-inner"><i class="fa-solid fa-box-open"></i></div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">No products found.</p>
                <p class="text-[11px] text-slate-400">Add products from dashboard to display here.</p>
            </div>
        `;
    } else {
        area.innerHTML = filtered.map(p => {
            const img = (p.images && p.images.length > 0) ? p.images[0] : "https://placehold.co/300x300/d4af37/ffffff?text=Product";
            return `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex space-x-3 p-3 items-center">
                <img src="${img}" class="w-20 h-20 rounded-xl object-cover border border-slate-100 flex-shrink-0">
                <div class="flex-1 flex flex-col justify-between">
                    <div>
                        <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">${p.category}</span>
                        <h4 class="text-xs font-bold text-slate-800 mt-1">${p.name}</h4>
                        <p class="text-[10px] text-slate-400">${p.metal_type ? p.metal_type.toUpperCase() : ''} ${p.purity || ''}</p>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                        <span class="text-xs font-bold text-amber-700">${p.price}</span>
                        <span class="text-[10px] text-slate-500 font-medium">${p.weight}g</span>
                    </div>
                </div>
                <button onclick="deleteProductFromSupabase(${p.id})" class="text-rose-400 hover:text-rose-600 p-2 text-sm"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `}).join('');
    }
}

/* ==========================================
   6. GROUPS & CATEGORIES MANAGEMENT (SUPABASE)
   ========================================== */
function openNewGroupModal() {
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('groupModal').classList.remove('hidden');
}

function openNewCategoryModal() {
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('categoryModal').classList.remove('hidden');
}

function closeModals() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('groupModal').classList.add('hidden');
    document.getElementById('categoryModal').classList.add('hidden');
}

async function saveNewGroup() {
    const input = document.getElementById('newGroupNameInput');
    const name = input.value.trim();
    if (!name) return alertBox('Please enter a group name');

    const { data, error } = await supabaseClient.from('groups').insert([{ name }]).select().single();
    if (error) return alertBox('Group already exists or error!');

    groupsList.push(data);
    input.value = '';
    renderGroupsAndCategories();
    closeModals();
    alertBox('Group Added!');
}

async function saveNewCategory() {
    const input = document.getElementById('newCategoryNameInput');
    const name = input.value.trim();
    if (!name) return alertBox('Please enter a category name');

    const { data, error } = await supabaseClient.from('categories').insert([{ name }]).select().single();
    if (error) return alertBox('Category already exists or error!');

    categoriesList.push(data);
    input.value = '';
    renderGroupsAndCategories();
    renderCatalogueCategories();
    closeModals();
    alertBox('Category Added!');
}

function renderGroupsAndCategories() {
    const groupContainer = document.getElementById('groupsListContainer');
    document.getElementById('groupCountBadge').innerText = `${groupsList.length} groups`;

    if (groupsList.length === 0) {
        groupContainer.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm"><p class="text-xs text-slate-400">No groups created yet. Click <b>+ Group</b> to add your first group.</p></div>`;
    } else {
        groupContainer.innerHTML = groupsList.map(g => `
            <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-xs"><i class="fa-solid fa-folder"></i></div>
                    <h4 class="text-xs font-bold text-slate-800">${g.name}</h4>
                </div>
                <button onclick="deleteGroup(${g.id})" class="text-rose-400 hover:text-rose-600 p-2"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `).join('');
    }

    const catContainer = document.getElementById('categoriesListContainer');
    document.getElementById('categoryCountBadge').innerText = `${categoriesList.length} categories`;

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
                            <h4 class="text-xs font-bold text-slate-800">${c.name}</h4>
                            <span class="text-[10px] text-slate-400">${count} products</span>
                        </div>
                    </div>
                    <button onclick="deleteCategory(${c.id})" class="text-rose-400 hover:text-rose-600 p-2"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
        }).join('');
    }

    const select = document.getElementById('productCategorySelect');
    if (select) {
        select.innerHTML = `<option value="" disabled selected>Select category</option>` +
            categoriesList.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
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

function renderCatalogueCategories() {
    const bar = document.getElementById('catalogueCategoriesBar');
    if (!bar) return;

    if (categoriesList.length === 0) {
        bar.innerHTML = `<p class="text-[11px] text-slate-400 py-1">No categories added yet.</p>`;
        return;
    }

    const allBtn = `
        <div onclick="renderCatalogueProducts(null)" class="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer">
            <div class="w-14 h-14 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center text-amber-700 font-bold text-xs shadow-sm">ALL</div>
            <span class="text-[11px] font-semibold text-slate-700">All</span>
        </div>
    `;

    const catBtns = categoriesList.map(c => `
        <div onclick="renderCatalogueProducts('${c.name}')" class="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer">
            <div class="w-14 h-14 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs overflow-hidden shadow-sm">
                ${c.name.substring(0, 4)}
            </div>
            <span class="text-[11px] font-semibold text-slate-700 truncate max-w-[60px]">${c.name}</span>
        </div>
    `).join('');

    bar.innerHTML = allBtn + catBtns;
}

/* ==========================================
   7. METAL RATES & AUTO PRICE CALCULATION
   ========================================== */
function recalculateMetalRates() {
    const goldBase = parseFloat(document.getElementById('baseGoldRateInput').value) || 0;
    const silverBase = parseFloat(document.getElementById('baseSilverRateInput').value) || 0;

    document.getElementById('dashGoldRate').innerHTML = `₹${goldBase.toLocaleString('en-IN')}<span class="text-[10px] text-slate-500">/10g</span>`;
    document.getElementById('dashSilverRate').innerHTML = `₹${silverBase.toLocaleString('en-IN')}<span class="text-[10px] text-slate-500">/kg</span>`;
    document.getElementById('catGoldDisplay').innerText = `₹${goldBase.toLocaleString('en-IN')}/10g`;
    document.getElementById('catSilverDisplay').innerText = `₹${silverBase.toLocaleString('en-IN')}/kg`;

    autoCalculateProductPrice();
}

async function saveMetalRates() {
    const goldBase = parseFloat(document.getElementById('baseGoldRateInput').value) || 0;
    const silverBase = parseFloat(document.getElementById('baseSilverRateInput').value) || 0;

    const { error } = await supabaseClient
        .from('store_settings')
        .update({ gold_rate_24k: goldBase, silver_rate_kg: silverBase })
        .eq('id', 1);

    if (error) {
        alertBox('Error saving rates!');
        return;
    }
    recalculateMetalRates();
    switchScreen('dashboardScreen');
    alertBox('Metal Rates Saved to Supabase!');
}

function autoCalculateProductPrice() {
    const metalType = document.getElementById('prodMetalType').value;
    const purity = document.getElementById('prodPurity').value;
    const weight = parseFloat(document.getElementById('prodWeight').value) || 0;

    let price = 0;
    if (metalType === 'gold') {
        const goldBase = parseFloat(document.getElementById('baseGoldRateInput').value) || 0;
        let purityFactor = 1;
        if (purity === '22K') purityFactor = 0.9167;
        else if (purity === '18K') purityFactor = 0.75;
        price = Math.round((goldBase / 10) * purityFactor * weight);
    } else {
        const silverBase = parseFloat(document.getElementById('baseSilverRateInput').value) || 0;
        price = Math.round((silverBase / 1000) * weight);
    }

    document.getElementById('prodAutoPrice').value = `₹${price.toLocaleString('en-IN')}`;
}

/* ==========================================
   8. EXCEL LEDGER & FINANCIAL CALCULATOR (SUPABASE)
   ========================================== */
function renderLedgerRowUI(entry, rowCount) {
    const tbody = document.getElementById('ledgerTableBody');
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
        .insert([{ entry_date: today, particulars: '', debit: 0, credit: 0 }])
        .select()
        .single();

    if (error) return alertBox('Error adding row!');

    const tbody = document.getElementById('ledgerTableBody');
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
    const balanceEl = document.getElementById('totalLedgerBalance');
    if (balanceEl) {
        balanceEl.innerText = `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function calcAppend(val) {
    calcExpression += val;
    document.getElementById('calcDisplay').innerText = calcExpression;
}

function calcClear() {
    calcExpression = "";
    document.getElementById('calcDisplay').innerText = "0";
}

function calcBack() {
    calcExpression = calcExpression.slice(0, -1);
    document.getElementById('calcDisplay').innerText = calcExpression || "0";
}

function calcCompute() {
    try {
        if (!calcExpression) return;
        calcExpression = String(eval(calcExpression));
        document.getElementById('calcDisplay').innerText = calcExpression;
    } catch (e) {
        document.getElementById('calcDisplay').innerText = "Error";
        calcExpression = "";
    }
}

/* =====================================================================
   [UPDATED: Catalogue Upgrade v2 - Existing functionality preserved]
   Photos lightbox, Share, Inquiry, QR, Menu, Back/Exit, CRUD, Settings,
   Customers, Cart, Search dropdown, Theme, Live rates/purities
   ===================================================================== */
const $ = id => document.getElementById(id);
const FRAME = () => document.querySelector('body>div.max-w-md');
const q = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const IMG = 'https://placehold.co/300x300/d4af37/ffffff?text=Product';
const DEF = {
    theme: '#d4af37', live: true,
    view: { price: true, weight: true, category: true, code: true },
    slider: { on: true, sec: 3 },
    gold: { '24K': 100, '22K': 91.67, '18K': 75, '14K': 58.33, '9K': 37.5 },
    silver: { '999 Fine': 100, '958 Britannia': 95.8, '925 Sterling': 92.5, '800 European': 80 }
};
let S = { name: 'Store', owner: '', mobile: '', address: '', pw: '1234', extra: JSON.parse(JSON.stringify(DEF)) };
let isOwner = false; // [UPDATED: set from Supabase Auth session]
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let customers = [], stack = [], sliT = null, _cat = null;
const BASE = () => location.origin + location.pathname;
const catLink = () => BASE() + '?catalogue=1';
const prodLink = id => BASE() + '?product=' + id;
const pcode = p => p.code || '#' + String(p.id).padStart(4, '0');
const pnum = p => parseFloat(String(p.price).replace(/[^\d.]/g, '')) || 0;
const pimg = p => (p.images && p.images[0]) || IMG;
const ownerNo = () => (S.mobile || '').replace(/\D/g, '').slice(-10);
const wa = (num, text) => window.open('https://wa.me/' + (num ? '91' + String(num).replace(/\D/g, '').slice(-10) : '') + '?text=' + encodeURIComponent(text), '_blank');

/* ---------- Messages (WhatsApp) ---------- */
const storeBlock = () => `*${S.name}*\n${S.owner}\n${S.mobile}\n${S.address}`;
const catMsg = () => `*Visit our catalogue to see the latest products.*\n\n${catLink()}\n\n${storeBlock()}`;
const prodMsg = p => `I am interested in this product. Code: ${pcode(p)}, Name: ${p.name}, Price: ${p.price}, Link: ${prodLink(p.id)}`;
const inqMsg = p => `Hello ${S.name},\n\nI'm interested in this product:\n\n*${p.category || 'Product'}*\nCode: ${pcode(p)}\nName: ${p.name}\n${p.size ? 'Size: ' + p.size + '\n' : ''}Weight: ${p.weight}g\nPrice: ${p.price}\n\nLink: ${prodLink(p.id)}\n\nPlease provide more details.`;

/* ---------- Generic modal ---------- */
function modal(html) {
    let m = $('uiModal');
    if (!m) {
        m = document.createElement('div'); m.id = 'uiModal';
        m.className = 'ov hidden fixed inset-0 z-[70] bg-black/60 flex items-end md:items-center justify-center';
        m.onclick = e => { if (e.target === m) m.classList.add('hidden'); };
        document.body.appendChild(m);
    }
    m.innerHTML = `<div class="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[90vh] overflow-y-auto space-y-3">${html}</div>`;
    m.classList.remove('hidden');
}
const closeUI = () => $('uiModal') && $('uiModal').classList.add('hidden');
const INP = 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm';
const BTN = 'theme-btn w-full font-bold py-3 rounded-xl shadow text-sm';

/* ---------- Photo lightbox ---------- */
function openImg(src) {
    let l = $('lightbox');
    if (!l) {
        l = document.createElement('div'); l.id = 'lightbox';
        l.className = 'ov hidden fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-3';
        l.onclick = () => l.classList.add('hidden');
        document.body.appendChild(l);
    }
    l.innerHTML = `<button class="absolute top-4 right-4 text-white text-3xl"><i class="fa-solid fa-xmark"></i></button><img src="${src}" class="max-w-full max-h-full object-contain">`;
    l.classList.remove('hidden');
}

/* ---------- Share sheet ---------- */
function shareSheet(t, id) {
    const p = t === 'p' ? productsList.find(x => x.id == id) : null;
    window._sh = { text: p ? prodMsg(p) : catMsg(), link: p ? prodLink(p.id) : catLink(), title: p ? p.name : S.name };
    const o = [['fa-brands fa-whatsapp', '#25D366', 'WhatsApp'], ['fa-brands fa-telegram', '#229ED9', 'Telegram'], ['fa-brands fa-facebook-f', '#1877F2', 'Facebook'], ['fa-solid fa-envelope', '#ea4335', 'Email'], ['fa-solid fa-link', '#64748b', 'Copy Link'], ['fa-solid fa-ellipsis', '#0f172a', 'More']];
    modal(`<h3 class="font-bold text-center">Share ${p ? 'Product' : 'Catalogue'}</h3><div class="grid grid-cols-3 gap-4 text-center text-xs">${o.map((x, i) => `<button onclick="shareTo(${i})"><span class="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white text-xl" style="background:${x[1]}"><i class="${x[0]}"></i></span><span class="block mt-1">${x[2]}</span></button>`).join('')}</div>`);
}
function shareTo(i) {
    const { text, link, title } = window._sh, e = encodeURIComponent;
    if (i == 0) wa('', text);
    else if (i == 1) window.open('https://t.me/share/url?url=' + e(link) + '&text=' + e(text), '_blank');
    else if (i == 2) window.open('https://www.facebook.com/sharer/sharer.php?u=' + e(link), '_blank');
    else if (i == 3) location.href = 'mailto:?subject=' + e(title) + '&body=' + e(text);
    else if (i == 4) navigator.clipboard.writeText(link).then(() => alertBox('Link copied!'));
    else if (navigator.share) navigator.share({ title, text, url: link }); else alertBox('Share not supported');
    closeUI();
}
const enquire = id => { const p = productsList.find(x => x.id == id); if (p) wa(ownerNo(), inqMsg(p)); };
const callOwner = () => ownerNo() ? (location.href = 'tel:+91' + ownerNo()) : alertBox('Owner number not added');
const waOwner = () => wa(ownerNo(), `Hello ${S.name}, I visited your catalogue.`);

/* ---------- Navigation: stack, Back button, Exit confirm ---------- */
const mainId = () => isOwner ? 'dashboardScreen' : 'viewCatalogueScreen';
const MY = ['productDetailScreen', 'settingsScreen'];
const _sw = switchScreen;
switchScreen = function (id) {
    if (id === 'dashboardScreen' && !isOwner) id = 'viewCatalogueScreen';
    _sw(id);
    MY.forEach(x => { if (x !== id && $(x)) $(x).classList.add('hidden'); });
    if (id === mainId()) stack = [id]; else if (stack[stack.length - 1] !== id) stack.push(id);
};
function closeOverlays() {
    const o = [...document.querySelectorAll('.ov:not(.hidden)')];
    o.forEach(e => e.classList.add('hidden'));
    const sb = $('searchBox'); if (sb && !sb.classList.contains('hidden')) { sb.classList.add('hidden'); o.push(sb); }
    return o.length > 0;
}
window.addEventListener('popstate', () => {
    if (closeOverlays()) return history.pushState({ b: 1 }, '');
    if (stack.length > 1) {
        stack.pop(); const id = stack[stack.length - 1];
        _sw(id); MY.forEach(x => { if (x !== id && $(x)) $(x).classList.add('hidden'); });
        return history.pushState({ b: 1 }, '');
    }
    if (confirm('Are you sure you want to exit?')) { window._exit = true; history.back(); }
    else history.pushState({ b: 1 }, '');
});
window.addEventListener('beforeunload', e => { if (!window._exit && stack.length <= 1) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- Load extra settings (theme, rates, view, slider) ---------- */
const _load = loadAllDataFromSupabase;
loadAllDataFromSupabase = async function () { await _load(); await afterLoad(); };
async function afterLoad() {
    const { data: s } = await supabaseClient.from('store_settings').select('*').eq('id', 1).single();
    if (s) {
        S.name = s.store_name; S.owner = s.owner_name !== 'Not Provided' ? s.owner_name : '';
        S.mobile = s.mobile !== 'Not Provided' ? s.mobile : ''; S.address = s.address !== 'Not Provided' ? s.address : '';
        S.extra = JSON.parse(JSON.stringify(Object.assign({}, DEF, s.extra || {})));
    }
    const { data: { session } } = await supabaseClient.auth.getSession(); isOwner = !!session;
    wire(); buildMenu(); applyExtra(); updateCartBadge(); await loadCustomers(); buildRates(); routeStart();
}
async function saveExtra() {
    const { error } = await supabaseClient.from('store_settings').update({ extra: S.extra }).eq('id', 1);
    if (error) alertBox('Error saving settings!'); else alertBox('Saved!');
    applyExtra();
}
function applyExtra() {
    document.documentElement.style.setProperty('--theme', S.extra.theme);
    const bar = document.querySelector('#viewCatalogueScreen > div.px-4.py-2'); if (bar) bar.style.display = S.extra.live ? '' : 'none';
    renderCatalogueProducts(_cat); renderSlider();
}
function routeStart() {
    const p = new URLSearchParams(location.search), pid = p.get('product');
    history.replaceState({ b: 0 }, ''); history.pushState({ b: 1 }, '');
    stack = [];
    switchScreen((isOwner && !p.has('catalogue') && !pid) ? 'dashboardScreen' : 'viewCatalogueScreen');
    if (pid) openProduct(+pid);
}

/* ---------- Login / Logout / Password ---------- */
/* [UPDATED: Supabase Auth login - Existing functionality preserved] */
function ownerLogin() { modal(`<h3 class="font-bold">Owner Login</h3><input id="lgEm" type="email" placeholder="Owner Email" class="${INP}"><input id="lgPw" type="password" placeholder="Password" class="${INP}"><button onclick="doLogin()" class="${BTN}">Login</button>`); }
async function doLogin() {
    const { error } = await supabaseClient.auth.signInWithPassword({ email: $('lgEm').value.trim(), password: $('lgPw').value });
    if (error) return alertBox('Wrong email or password');
    isOwner = true; closeUI(); buildMenu(); wire(); renderCatalogueProducts(_cat); await loadCustomers(); switchScreen('dashboardScreen'); alertBox('Welcome Owner!');
}
async function resetPw() {
    const n = prompt('New password (min 6 characters)'); if (!n || n.length < 6) return alertBox('Min 6 characters');
    const { error } = await supabaseClient.auth.updateUser({ password: n });
    alertBox(error ? 'Error: ' + error.message : 'Password changed in Supabase');
}
const _ma = menuAction;
menuAction = function (n) {
    if (n === 'Logout') { toggleHamburgerMenu(); supabaseClient.auth.signOut(); isOwner = false; buildMenu(); renderCatalogueProducts(_cat); switchScreen('viewCatalogueScreen'); alertBox('Logged out'); }
    else if (n === 'Reset Password') { toggleHamburgerMenu(); resetPw(); }
    else _ma(n);
};

/* ---------- Three-dot menu ---------- */
function buildMenu() {
    const it = [['fa-solid fa-store text-amber-600', 'Store Profile', "switchScreen('storeProfileScreen')"], ['fa-solid fa-phone text-amber-600', 'Call', 'callOwner()'], ['fa-brands fa-whatsapp text-emerald-600', 'WhatsApp', 'waOwner()'], ['fa-solid fa-share-nodes text-blue-600', 'Share', "shareSheet('c')"]];
    if (isOwner) it.push(['fa-solid fa-gauge text-blue-600', 'Go to Dashboard', "switchScreen('dashboardScreen')"]); else it.push(['fa-solid fa-user text-amber-600', 'Login', 'ownerLogin()']);
    $('catalogueOptionsMenu').innerHTML = it.map(x => `<a href="#" onclick="event.preventDefault();toggleCatalogueOptionsMenu();${x[2]}" class="flex items-center space-x-2 px-4 py-2.5 hover:bg-amber-50 font-medium"><i class="${x[0]}"></i><span>${x[1]}</span></a>`).join('');
    const bb = $('viewCatalogueScreen').lastElementChild; if (bb) bb.style.display = isOwner ? '' : 'none';
}

/* ---------- Wire existing buttons to working functions ---------- */
function wire() {
    const o = (s, f) => { const e = document.querySelector(s); if (e) e.onclick = f; };
    const hdr = $('viewCatalogueScreen').firstElementChild, r = hdr.lastElementChild;
    if (!$('cartBadge')) r.insertAdjacentHTML('afterbegin', `<button onclick="openCart()" class="relative bg-white/20 p-2 rounded-full text-white text-xs"><i class="fa-solid fa-cart-shopping"></i><span id="cartBadge" class="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] rounded-full px-1 hidden">0</span></button>`);
    o('#viewCatalogueScreen [onclick*="Search clicked"]', toggleSearch);
    o('#contentCatalogue [onclick*="Store QR"]', openQR);
    o('[onclick*="Link Copied to Clipboard"]', () => shareSheet('c'));
    o('#storeProfileScreen [onclick*="Profile Link"]', () => shareSheet('c'));
    o('#storeProfileScreen [onclick*="Calling"]', callOwner);
    o('#storeProfileScreen [onclick*="Opening WhatsApp"]', waOwner);
    o('#contentCatalogue button.from-lime-400 span.text-emerald-600', e => { e.stopPropagation(); shareSheet('c'); });
    const t = document.querySelectorAll('#contentCustomers .grid > div');
    if (t[0]) { t[0].onclick = listCustomers; t[1].onclick = addCustomerForm; t[2].onclick = msgCustomers; }
    if (!$('stLink')) {
        const a = document.querySelector('#hamburgerSidebar a[onclick*="categoriesScreen"]');
        if (a) a.insertAdjacentHTML('beforebegin', `<a id="stLink" href="#" onclick="event.preventDefault();toggleHamburgerMenu();settingsScreen()" class="flex items-center space-x-3 font-medium hover:text-amber-600 transition"><span class="text-slate-600 text-sm"><i class="fa-solid fa-gear"></i></span><span>Settings</span></a>`);
        const sh = document.querySelector('[title="Share Store"]');
        if (sh) sh.insertAdjacentHTML('beforebegin', `<button onclick="settingsScreen()" class="bg-amber-600/40 p-2 rounded-full text-white text-sm" title="Settings"><i class="fa-solid fa-gear"></i></button>`);
        const ub = document.querySelector('#addProductScreen button[onclick*="saveAndUploadProduct"]');
        if (ub) ub.insertAdjacentHTML('beforebegin', `<div class="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xs font-bold text-amber-700 tracking-wider">DETAILS</h2><input id="prodLocInput" placeholder="Address / Location" class="${INP}"><textarea id="prodDescInput" rows="3" placeholder="Description" class="${INP}"></textarea></div>`);
    }
}
/* Create: also save description & location */
const _sv = saveAndUploadProduct;
saveAndUploadProduct = async function () {
    const n = productsList.length, d = $('prodDescInput').value.trim(), l = $('prodLocInput').value.trim();
    await _sv();
    if (productsList.length > n && (d || l)) {
        const p = productsList[0]; Object.assign(p, { description: d, location: l });
        await supabaseClient.from('products').update({ description: d, location: l }).eq('id', p.id);
        $('prodDescInput').value = ''; $('prodLocInput').value = '';
    }
};

/* ---------- Catalogue product grid (clickable photos) ---------- */
renderCatalogueProducts = function (cat = null, qs = '') {
    _cat = cat;
    const area = $('catalogueProductsArea'), v = S.extra.view;
    const list = productsList.filter(p => (!cat || p.category === cat) && (!qs || (p.name + p.category + pcode(p)).toLowerCase().includes(qs)));
    area.className = 'w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3';
    if (!list.length) { area.innerHTML = `<div class="col-span-full text-center py-16 text-xs font-bold text-slate-500 uppercase">No products found.</div>`; return; }
    area.innerHTML = list.map(p => `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div class="relative">
        <img src="${pimg(p)}" onclick="openImg('${pimg(p)}')" class="w-full aspect-square object-cover cursor-zoom-in">
        ${v.code ? `<span class="absolute top-2 left-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded">${pcode(p)}</span>` : ''}
        ${v.weight ? `<span class="absolute bottom-2 left-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded">${p.weight}g</span>` : ''}
      </div>
      <div class="p-3 flex-1 flex flex-col gap-1">
        <h4 onclick="openProduct(${p.id})" class="text-sm font-bold text-slate-800 cursor-pointer">${q(p.name)}</h4>
        ${v.category ? `<span class="text-[10px] w-max bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">${q(p.category)}</span>` : ''}
        ${v.price ? `<span class="text-base font-bold text-amber-700">${q(p.price)}</span>` : ''}
        <div class="flex gap-2 mt-auto pt-2">
          <button onclick="addCart(${p.id})" class="flex-1 border border-slate-300 rounded-lg py-1.5 text-xs font-bold"><i class="fa-solid fa-cart-plus"></i> Add</button>
          <button onclick="shareSheet('p',${p.id})" class="border border-slate-300 rounded-lg px-2.5 text-xs"><i class="fa-solid fa-share-nodes"></i></button>
          ${isOwner ? `<button onclick="if(confirm('Delete product?'))deleteProductFromSupabase(${p.id})" class="border border-rose-200 text-rose-500 rounded-lg px-2.5 text-xs"><i class="fa-solid fa-trash-can"></i></button>` : ''}
        </div>
      </div>
    </div>`).join('');
};
function renderSlider() {
    clearInterval(sliT);
    let el = $('sliderBox'); if (!el) { el = document.createElement('div'); el.id = 'sliderBox'; $('catalogueCategoriesBar').before(el); }
    const imgs = productsList.map(p => p.images && p.images[0]).filter(Boolean).slice(0, 8), on = S.extra.slider.on && imgs.length;
    el.className = on ? 'h-40 md:h-64 overflow-hidden bg-slate-200' : 'hidden'; if (!on) return;
    let i = 0; el.innerHTML = `<img id="sliderImg" src="${imgs[0]}" onclick="openImg(this.src)" class="w-full h-full object-cover cursor-zoom-in">`;
    sliT = setInterval(() => { i = (i + 1) % imgs.length; const s = $('sliderImg'); if (s) s.src = imgs[i]; }, S.extra.slider.sec * 1000);
}

/* ---------- Search + dynamic category dropdown ---------- */
function toggleSearch() {
    let b = $('searchBox');
    if (!b) {
        b = document.createElement('div'); b.id = 'searchBox';
        b.className = 'hidden absolute top-full left-0 right-0 bg-white shadow-xl text-slate-800 max-h-[70vh] overflow-y-auto';
        b.innerHTML = `<div class="p-3"><input id="searchInp" oninput="doSearch(this.value)" placeholder="Search products..." class="w-full bg-slate-100 rounded-full px-4 py-2.5 text-sm outline-none border-2 border-amber-300"></div><div id="searchList"></div>`;
        $('viewCatalogueScreen').firstElementChild.appendChild(b);
    }
    b.classList.toggle('hidden');
    if (!b.classList.contains('hidden')) { $('searchInp').value = ''; doSearch(''); $('searchInp').focus(); }
}
function doSearch(s) {
    s = s.toLowerCase().trim();
    const cats = categoriesList.filter(c => c.name.toLowerCase().includes(s));
    const prods = s ? productsList.filter(p => (p.name + pcode(p)).toLowerCase().includes(s)).slice(0, 6) : [];
    $('searchList').innerHTML = cats.map(c => `<div onclick="pickCat('${c.name.replace(/'/g, "\\'")}')" class="flex items-center gap-3 px-5 py-3 text-sm border-b cursor-pointer hover:bg-amber-50"><i class="fa-solid fa-magnifying-glass text-amber-500"></i>${q(c.name)}</div>`).join('')
        + prods.map(p => `<div onclick="$('searchBox').classList.add('hidden');openProduct(${p.id})" class="flex items-center gap-3 px-5 py-3 text-sm border-b cursor-pointer hover:bg-amber-50"><img src="${pimg(p)}" class="w-8 h-8 rounded object-cover">${q(p.name)} <span class="text-xs text-slate-400">${pcode(p)}</span></div>`).join('')
        || '';
    if (!cats.length && !prods.length) $('searchList').innerHTML = '<p class="p-4 text-xs text-slate-400">No results</p>';
}
function pickCat(n) { $('searchBox').classList.add('hidden'); renderCatalogueProducts(n); }

/* ---------- Product detail (customer view + Owner CRUD) ---------- */
function openProduct(id) {
    const p = productsList.find(x => x.id == id); if (!p) return;
    let s = $('productDetailScreen');
    if (!s) { s = document.createElement('div'); s.id = 'productDetailScreen'; s.className = 'hidden flex flex-col bg-slate-50 overflow-y-auto absolute inset-0 z-[45]'; FRAME().appendChild(s); }
    const im = p.images && p.images.length ? p.images : [IMG], v = S.extra.view;
    const chip = t => `<span class="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">${t}</span>`;
    const body = isOwner ? `
      <label class="text-xs font-bold">Product Name</label><input id="pd_name" value="${q(p.name)}" class="${INP}">
      <label class="text-xs font-bold">Category</label><select id="pd_cat" class="${INP}">${categoriesList.map(c => `<option value="${q(c.name)}" ${c.name === p.category ? 'selected' : ''}>${q(c.name)}</option>`).join('')}</select>
      <label class="text-xs font-bold">Price</label><input id="pd_price" value="${q(p.price)}" class="${INP}">
      <label class="text-xs font-bold">Address / Location</label><input id="pd_loc" value="${q(p.location)}" class="${INP}">
      <label class="text-xs font-bold">Description</label><textarea id="pd_desc" rows="4" class="${INP}">${q(p.description)}</textarea>
      <div class="flex gap-2"><button onclick="saveProd(${p.id})" class="${BTN}"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button><button onclick="delProd(${p.id})" class="bg-rose-600 text-white font-bold px-5 rounded-xl"><i class="fa-solid fa-trash-can"></i></button></div>`
        : `<h2 class="text-xl font-bold">${q(p.name)}</h2>
      ${v.price ? `<p class="text-2xl font-bold text-amber-700">${q(p.price)}</p>` : ''}
      <div class="flex flex-wrap gap-2">${v.code ? chip(pcode(p)) : ''}${v.category ? chip(q(p.category)) : ''}${v.weight ? chip(p.weight + 'g') : ''}${p.size ? chip('Size: ' + q(p.size)) : ''}${p.purity ? chip(q((p.metal_type || '') + ' ' + p.purity)) : ''}</div>
      ${p.description ? `<p class="text-sm text-slate-600">${q(p.description)}</p>` : ''}
      ${p.location ? `<p class="text-sm text-rose-600"><i class="fa-solid fa-location-dot"></i> ${q(p.location)}</p>` : ''}`;
    s.innerHTML = `
    <div class="bg-[#d4af37] text-white px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-20">
      <div class="flex items-center gap-3 min-w-0"><button onclick="history.back()" class="text-xl"><i class="fa-solid fa-arrow-left"></i></button><h1 class="font-bold truncate">${q(S.name)}</h1></div>
      <div class="flex gap-3 text-lg"><button onclick="openCart()"><i class="fa-solid fa-cart-shopping"></i></button><button onclick="shareSheet('p',${p.id})"><i class="fa-solid fa-share-nodes"></i></button></div>
    </div>
    <div class="md:grid md:grid-cols-2 gap-6 p-4 max-w-5xl w-full mx-auto pb-10">
      <div><img id="pdMain" src="${im[0]}" onclick="openImg(this.src)" class="w-full max-h-[70vh] object-contain bg-white rounded-2xl border cursor-zoom-in">
        <div class="flex gap-2 mt-2 overflow-x-auto">${im.map(u => `<img src="${u}" onclick="pdMain.src='${u}'" class="w-16 h-16 rounded-xl object-cover border cursor-pointer">`).join('')}</div></div>
      <div class="space-y-3 mt-4 md:mt-0">${body}
        <div class="flex gap-2 pt-2"><button onclick="addCart(${p.id})" class="flex-1 border-2 border-slate-800 font-bold py-3 rounded-xl text-sm"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>
        <button onclick="enquire(${p.id})" class="${BTN} flex-1"><i class="fa-brands fa-whatsapp"></i> Enquiry</button></div></div>
    </div>`;
    switchScreen('productDetailScreen');
}
async function saveProd(id) {
    const g = k => $('pd_' + k).value.trim(), pr = g('price');
    const u = { name: g('name'), category: $('pd_cat').value, price: pr.startsWith('₹') ? pr : '₹' + pr, description: g('desc'), location: g('loc') };
    const { error } = await supabaseClient.from('products').update(u).eq('id', id);
    if (error) return alertBox('Error saving product!');
    Object.assign(productsList.find(x => x.id == id), u); renderCatalogueProducts(_cat); renderGroupsAndCategories(); alertBox('Product Updated!');
}
async function delProd(id) {
    if (!confirm('Delete this product?')) return;
    await deleteProductFromSupabase(id); history.back();
}

/* ---------- Cart ---------- */
function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); updateCartBadge(); }
function addCart(id) { const c = cart.find(x => x.id == id); c ? c.q++ : cart.push({ id, q: 1 }); saveCart(); alertBox('Added to Cart'); }
function updateCartBadge() { const n = cart.reduce((a, c) => a + c.q, 0), b = $('cartBadge'); if (b) { b.textContent = n; b.classList.toggle('hidden', !n); } }
function chQ(id, d) { const c = cart.find(x => x.id == id); c.q += d; if (c.q < 1) cart = cart.filter(x => x.id != id); saveCart(); openCart(); }
function cartRows() { return cart.map(c => ({ p: productsList.find(x => x.id == c.id), q: c.q })).filter(r => r.p); }
function openCart() {
    const rows = cartRows(), total = rows.reduce((a, r) => a + pnum(r.p) * r.q, 0);
    modal(`<h3 class="font-bold text-lg">Your Cart</h3>` + (rows.length ? rows.map(r => `<div class="flex items-center gap-3"><img src="${pimg(r.p)}" class="w-14 h-14 rounded-xl object-cover"><div class="flex-1 text-xs"><b>${q(r.p.name)}</b><br>${q(r.p.price)}</div><button onclick="chQ(${r.p.id},-1)" class="w-7 h-7 border rounded-full">−</button><b>${r.q}</b><button onclick="chQ(${r.p.id},1)" class="w-7 h-7 border rounded-full">+</button></div>`).join('')
        + `<div class="font-bold text-right">Total: ₹${total.toLocaleString('en-IN')}</div><button onclick="sendOrder()" class="${BTN}"><i class="fa-brands fa-whatsapp"></i> Send Inquiry / Order</button>` : '<p class="text-sm text-slate-500">Cart is empty.</p>'));
}
function sendOrder() {
    const rows = cartRows(); let t = `Hello ${S.name},\n\nI want to inquire/order these products:\n\n`, total = 0;
    rows.forEach((r, i) => { total += pnum(r.p) * r.q; t += `${i + 1}. *${r.p.name}*\nCode: ${pcode(r.p)} | Qty: ${r.q} | Price: ${r.p.price}\nLink: ${prodLink(r.p.id)}\n\n`; });
    t += `Total: ₹${total.toLocaleString('en-IN')}\n\nPlease provide more details.`; wa(ownerNo(), t);
}

/* ---------- QR Code generator ---------- */
function openQR() {
    modal(`<h3 class="font-bold text-lg">Store QR Code</h3>
    <input id="qrOwner" value="${q(S.owner)}" placeholder="Owner Name" class="${INP}" oninput="makeQR()">
    <input id="qrLink" value="${catLink()}" placeholder="Catalogue Website Link" class="${INP}" oninput="makeQR()">
    <p id="qrCap" class="text-center font-bold"></p><div id="qrBox" class="flex justify-center p-2"></div>
    <button onclick="dlQR()" class="${BTN}"><i class="fa-solid fa-download"></i> Download QR</button>`);
    makeQR();
}
function makeQR() {
    const b = $('qrBox'); b.innerHTML = ''; $('qrCap').textContent = S.name + ($('qrOwner').value ? ' • ' + $('qrOwner').value : '');
    new QRCode(b, { text: $('qrLink').value || catLink(), width: 220, height: 220 });
}
function dlQR() {
    const c = $('qrBox').querySelector('canvas'), o = document.createElement('canvas'); o.width = 300; o.height = 360;
    const x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 360); x.fillStyle = '#000'; x.textAlign = 'center';
    x.font = 'bold 18px sans-serif'; x.fillText(S.name, 150, 28); x.font = '14px sans-serif'; x.fillText($('qrOwner').value, 150, 50);
    x.drawImage(c, 40, 70, 220, 220); x.fillText('Scan to view our catalogue', 150, 325);
    const a = document.createElement('a'); a.download = 'store-qr.png'; a.href = o.toDataURL(); a.click();
}

/* ---------- Customers (Add / List / Send Message) ---------- */
async function loadCustomers() {
    const { data } = await supabaseClient.from('customers').select('*').order('id', { ascending: false }); customers = data || [];
    const b = document.querySelector('#contentCustomers .grid > div span'); if (b) b.textContent = customers.length;
    const rc = document.querySelector('#contentCustomers .bg-white.p-4 p');
    if (rc) rc.innerHTML = customers.length ? customers.slice(0, 5).map(c => `${q(c.name)} - ${q(c.mobile)}`).join('<br>') : 'No recent customer interactions found. Start by adding a customer above.';
}
function addCustomerForm() {
    modal(`<h3 class="font-bold text-lg">Add Customer</h3><input id="cuName" placeholder="Customer Name" class="${INP}"><input id="cuMob" type="tel" placeholder="Mobile Number" class="${INP}"><input id="cuAddr" placeholder="Address" class="${INP}"><button onclick="saveCustomer()" class="${BTN}">Save Customer</button>`);
}
async function saveCustomer() {
    const c = { name: $('cuName').value.trim(), mobile: $('cuMob').value.trim(), address: $('cuAddr').value.trim() };
    if (!c.name || !c.mobile) return alertBox('Name & mobile required');
    const { error } = await supabaseClient.from('customers').insert([c]); if (error) return alertBox('Error saving customer!');
    closeUI(); await loadCustomers(); alertBox('Customer Saved!');
}
function listCustomers(msg) {
    modal(`<h3 class="font-bold text-lg">${msg === true ? 'Send Message' : 'All Customers'}</h3>` + (customers.length ? customers.map(c => `<div class="flex items-center gap-2 border-b pb-2 text-xs"><div class="flex-1"><b>${q(c.name)}</b><br>${q(c.mobile)}<br><span class="text-slate-400">${q(c.address)}</span></div>
      <a href="tel:${q(c.mobile)}" class="p-2 text-blue-600"><i class="fa-solid fa-phone"></i></a><button onclick="wa('${q(c.mobile)}',catMsg())" class="p-2 text-emerald-600"><i class="fa-brands fa-whatsapp"></i></button>
      <button onclick="delCustomer(${c.id})" class="p-2 text-rose-500"><i class="fa-solid fa-trash-can"></i></button></div>`).join('') : '<p class="text-sm text-slate-500">No customers yet.</p>'));
}
const msgCustomers = () => listCustomers(true);
async function delCustomer(id) { if (!confirm('Delete customer?')) return; await supabaseClient.from('customers').delete().eq('id', id); await loadCustomers(); listCustomers(); }

/* ---------- Settings page ---------- */
function settingsScreen() {
    let s = $('settingsScreen');
    if (!s) { s = document.createElement('div'); s.id = 'settingsScreen'; s.className = 'hidden flex flex-col bg-slate-100 overflow-y-auto absolute inset-0 z-40'; FRAME().appendChild(s); }
    const grp = (t, a) => `<p class="text-xs font-bold text-slate-500 px-1 pt-3">${t}</p><div class="bg-white rounded-2xl shadow-sm divide-y">${a.map(x => `<div onclick="${x[3]}" class="flex items-center gap-3 p-4 cursor-pointer hover:bg-amber-50"><span class="text-2xl">${x[0]}</span><div class="flex-1"><b class="text-sm">${x[1]}</b><p class="text-xs text-slate-500">${x[2]}</p></div><i class="fa-solid fa-chevron-right text-slate-400 text-xs"></i></div>`).join('')}</div>`;
    s.innerHTML = `<div class="bg-[#d4af37] text-white px-4 py-3.5 flex items-center gap-3 shadow-md sticky top-0 z-20"><button onclick="history.back()" class="text-xl"><i class="fa-solid fa-arrow-left"></i></button><h1 class="text-base font-bold">Settings</h1></div>
    <div class="p-4 max-w-2xl w-full mx-auto space-y-2 pb-10">`
        + grp('ACCOUNT', [['👤', 'Edit Profile', 'Shop name, logo, owner photo, address', "switchScreen('editProfileScreen')"], ['🔑', 'Reset Password', 'Change your login password', 'resetPw()']])
        + grp('CATALOGUE', [['📋', 'Product View Settings', 'Control what shows on product cards', 'viewSheet()'], ['📂', 'Manage Categories', 'Add, edit and reorder categories', "switchScreen('categoriesScreen')"], ['🎨', 'Theme Colors', 'Customize your catalogue appearance', 'themeSheet()'], ['📺', 'Slider Settings', 'TV display and slider configuration', 'sliderSheet()'], ['💰', 'Metal Rates', 'Live rates & purities', "switchScreen('metalRatesScreen')"]]) + '</div>';
    switchScreen('settingsScreen');
}
function viewSheet() {
    modal('<h3 class="font-bold text-lg">Product View Settings</h3>' + ['price', 'weight', 'category', 'code'].map(k => `<label class="flex justify-between py-2 capitalize text-sm">Show ${k}<input type="checkbox" ${S.extra.view[k] ? 'checked' : ''} onchange="S.extra.view.${k}=this.checked;saveExtra()"></label>`).join(''));
}
function themeSheet() {
    const cols = ['#d4af37', '#b91c1c', '#047857', '#1d4ed8', '#7c3aed', '#be185d', '#0f172a', '#ea580c'];
    modal(`<h3 class="font-bold text-lg">Theme Colors</h3><div class="flex flex-wrap gap-3">${cols.map(c => `<button onclick="setTheme('${c}')" style="background:${c}" class="w-11 h-11 rounded-full border-2 border-white shadow"></button>`).join('')}</div><label class="flex items-center justify-between text-sm">Custom colour <input type="color" value="${S.extra.theme}" onchange="setTheme(this.value)"></label>`);
}
function setTheme(c) { S.extra.theme = c; saveExtra(); }
function sliderSheet() {
    modal(`<h3 class="font-bold text-lg">Slider Settings</h3><label class="flex justify-between text-sm">Show banner slider<input type="checkbox" ${S.extra.slider.on ? 'checked' : ''} onchange="S.extra.slider.on=this.checked;saveExtra()"></label><label class="flex justify-between items-center text-sm">Seconds per slide<input type="number" min="1" max="20" value="${S.extra.slider.sec}" class="w-20 border rounded-lg p-1 text-center" onchange="S.extra.slider.sec=Math.max(1,+this.value||3);saveExtra()"></label>`);
}

/* ---------- Metal rates: live toggle + purity tables ---------- */
function buildRates() {
    const sc = $('metalRatesScreen').lastElementChild; let b = $('purBox');
    if (!b) { b = document.createElement('div'); b.id = 'purBox'; b.className = 'space-y-4'; sc.insertBefore(b, sc.lastElementChild); }
    const g = +$('baseGoldRateInput').value || 0, s = +$('baseSilverRateInput').value || 0, e = S.extra;
    const tbl = (t, obj, base, k) => `<div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xs font-bold text-amber-700 mb-1">${t}</h2>` + Object.entries(obj).map(([n, pc]) => `<div class="flex items-center justify-between py-2 border-b text-sm"><b class="w-28 text-amber-600">${n}</b><span><input type="number" step="0.01" value="${pc}" onchange="setPur('${k}','${n}',this.value)" class="w-20 border rounded-lg text-center p-1"> %</span><b>₹${Math.round(base * pc / 100).toLocaleString('en-IN')}</b></div>`).join('') + '</div>';
    b.innerHTML = `<div class="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap justify-between items-center gap-2"><div class="min-w-[150px]"><b>Live Rates in Catalogue</b><p class="text-xs text-slate-500">When disabled, the rates box is hidden.</p></div><div class="flex gap-3 text-sm font-bold"><label class="text-green-600"><input type="radio" name="lv" ${e.live ? 'checked' : ''} onchange="setLive(true)"> Enable</label><label class="text-red-600"><input type="radio" name="lv" ${!e.live ? 'checked' : ''} onchange="setLive(false)"> Disable</label></div></div>`
        + tbl('GOLD PURITIES (per 10g)', e.gold, g, 'gold') + tbl('SILVER PURITIES (per kg)', e.silver, s, 'silver');
}
function setPur(k, n, v) { S.extra[k][n] = parseFloat(v) || 0; buildRates(); }
function setLive(v) { S.extra.live = v; }
const _rmr = recalculateMetalRates;
recalculateMetalRates = function () { _rmr(); if ($('purBox')) buildRates(); };
const _smr = saveMetalRates;
saveMetalRates = async function () { await _smr(); await saveExtra(); };
