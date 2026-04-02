// app.js - Main application logic
import {
  loginAdmin, logoutAdmin, onAuthChange,
  getProducts, getProduct, addProduct, updateProduct, deleteProduct,
  getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement,
  getOrders, getOrder, addOrder, updateOrder, deleteOrder,
  uploadImage, deleteImage
} from './firebase-config.js';

// ===== STATE =====
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let currentAdmin = null;
let allProducts = [];
let allAnnouncements = [];
let allOrders = [];
let currentAdminSection = 'dashboard';
let selectedProductImages = [];
let selectedAnnouncementImages = [];
let editingProductId = null;
let editingAnnouncementId = null;
let currentProductModal = null;
let currentAnnouncementModal = null;

// ===== CART =====
const saveCart = () => localStorage.setItem('cart', JSON.stringify(cart));

const getCartCount = () => cart.reduce((sum, i) => sum + i.qty, 0);

const updateCartBadge = () => {
  const count = getCartCount();
  document.getElementById('cart-count').textContent = count || '';
  document.getElementById('cart-count').style.display = count ? 'flex' : 'none';
};

const addToCart = (product, qty = 1) => {
  const existing = cart.find(i => i.id === product.id);
  if (existing) existing.qty += qty;
  else cart.push({ id: product.id, name: product.name, price: product.price, image: product.images?.[0] || '', qty });
  saveCart();
  updateCartBadge();
  showToast(`✝ "${product.name}" adăugat în coș!`);
};

const removeFromCart = (id) => {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartBadge();
  renderCart();
};

const updateCartQty = (id, delta) => {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) return removeFromCart(id);
    saveCart();
    updateCartBadge();
    renderCart();
  }
};

// ===== TOAST =====
const showToast = (msg, duration = 3000) => {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
};

// ===== NAVIGATION =====
const showPage = (page) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  const navLink = document.querySelector(`.nav-links a[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'home') renderHome();
  if (page === 'shop') renderShop();
  if (page === 'announcements') renderAnnouncements();
  if (page === 'cart') renderCart();
  if (page === 'admin') {
    if (!currentAdmin) { showAdminLogin(); return; }
    renderAdminSection('dashboard');
  }
};

// ===== EASTER TIMER =====
const startEasterTimer = () => {
  const getEaster = (year) => {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    // Orthodox Easter (Julian +13 days approx)
    const orthodox = new Date(year, month - 1, day + 13);
    return orthodox;
  };

  const updateTimer = () => {
    const now = new Date();
    let easterYear = now.getFullYear();
    let easter = getEaster(easterYear);
    if (now > easter) { easterYear++; easter = getEaster(easterYear); }

    const diff = easter - now;
    if (diff <= 0) {
      document.getElementById('easter-banner').classList.add('hristos');
      document.getElementById('easter-banner').innerHTML = '✝ HRISTOS A ÎNVIAT! ADEVĂRAT A ÎNVIAT! ✝';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('t-days').textContent = String(days).padStart(2, '0');
    document.getElementById('t-hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('t-mins').textContent = String(mins).padStart(2, '0');
    document.getElementById('t-secs').textContent = String(secs).padStart(2, '0');
  };

  updateTimer();
  setInterval(updateTimer, 1000);
};

// ===== HOME PAGE =====
const saints = [
  { date: '0101', name: 'Tăierea Împrejur a Domnului', desc: 'Pomenind Tăierea Împrejur cea după trup a Mântuitorului nostru Iisus Hristos și Sfântul Vasile cel Mare.' },
  { date: '0106', name: 'Botezul Domnului (Boboteaza)', desc: 'Arătarea Domnului. Sfânta Teofanie – botezul lui Iisus în Iordan.' },
  { date: '0124', name: 'Sfântul Xenia', desc: 'Cuvioasă din Petersburg, cunoscută pentru rugăciunile de ajutor.' },
  { date: '0201', name: 'Sfântul Trifon', desc: 'Mucenicul Trifon cel din Frigia, tăiată cu sabia.' },
  { date: '0214', name: 'Sfântul Auxentie', desc: 'Cuviosul Auxentie de la Muntele Oxia.' },
  { date: '0224', name: 'Aflarea Capului Sfântului Ioan Botezătorul', desc: 'Prima și a doua Aflare a cinstitului cap.' },
  { date: '0301', name: 'Sfântul Evdochia', desc: 'Cuvioasa Muceniță Evdochia.' },
  { date: '0325', name: 'Buna Vestire', desc: 'Buna Vestire a Preasfintei Născătoare de Dumnezeu.' },
  { date: '0401', name: 'Cuvioasa Maria Egipteanca', desc: 'Pomenirea Cuvioasei Maria Egipteanca.' },
  { date: '0402', name: 'Sfântul Tit', desc: 'Pomenirea Cuviosului Tit, tămăduitorul de minuni.' },
  { date: '0423', name: 'Sfântul Mare Mucenic Gheorghe Purtătorul de Biruință', desc: 'Hramul multor biserici, model de credință și curaj.' },
  { date: '0524', name: 'Sfântul Simeon', desc: 'Sfântul Simeon cel din Muntele Minunat.' },
  { date: '0615', name: 'Sfântul Profet Amos', desc: 'Pomenirea Sfântului Profet Amos.' },
  { date: '0629', name: 'Sfinții Apostoli Petru și Pavel', desc: 'Prăznuirea Sfinților Apostoli Petru și Pavel.' },
  { date: '0720', name: 'Sfântul Proroc Ilie Tesviteanul', desc: 'Cel luat la cer în car de foc.' },
  { date: '0815', name: 'Adormirea Maicii Domnului', desc: 'Cea mai mare sărbătoare închinată Maicii Domnului.' },
  { date: '0914', name: 'Înălțarea Sfintei Cruci', desc: 'Ziua crucii lui Hristos – post negru.' },
  { date: '1014', name: 'Sfânta Cuvioasă Parascheva', desc: 'Ocrotitoarea Moldovei, moaștele la Iași.' },
  { date: '1026', name: 'Sfântul Mare Mucenic Dimitrie', desc: 'Izvorâtorul de Mir, ocrotitorul Tesalonicului.' },
  { date: '1108', name: 'Soborul Sfinților Arhangheli Mihail și Gavriil', desc: 'Prăznuirea tuturor puterilor cerești fără de trup.' },
  { date: '1130', name: 'Sfântul Apostol Andrei', desc: 'Cel Întâi Chemat, Ocrotitorul României.' },
  { date: '1206', name: 'Sfântul Ierarh Nicolae', desc: 'Arhiepiscopul Mirelor Lichiei, Făcătorul de Minuni.' },
  { date: '1225', name: 'Nașterea Domnului (Crăciunul)', desc: 'Praznicul Nașterii lui Hristos.' },
];

const verses = [
  { text: 'Căci atât de mult a iubit Dumnezeu lumea, încât L-a dat pe Fiul Său cel Unul-Născut, ca oricine crede în El să nu piară, ci să aibă viață veșnică.', ref: 'Ioan 3:16' },
  { text: 'Eu sunt calea, adevărul și viața. Nimeni nu vine la Tatăl decât prin Mine.', ref: 'Ioan 14:6' },
  { text: 'Doamne, Tu mi-ai cercetat și m-ai cunoscut. Tu cunoști șezutul meu și scularea mea.', ref: 'Psalm 139:1' },
  { text: 'Fiți tari și îmbărbătați-vă! Nu vă temeți și nu vă înspăimântați de ei, căci Domnul Dumnezeul vostru merge cu voi.', ref: 'Deuteronom 31:6' },
  { text: 'Căutați mai întâi Împărăția lui Dumnezeu și dreptatea Lui, și toate acestea se vor adăuga vouă.', ref: 'Matei 6:33' },
  { text: 'Și iată, Eu sunt cu voi în toate zilele, până la sfârșitul veacului.', ref: 'Matei 28:20' },
  { text: 'Doamne, tu ești lumina mea și mântuirea mea; de cine mă voi teme?', ref: 'Psalm 27:1' },
];

const getSaintOfDay = () => {
  const now = new Date();
  const key = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
  return saints.find(s => s.date === key) || {
    name: 'Sfântul zilei',
    desc: 'Rugați-vă cu credință și dragoste, căci Dumnezeu este cu voi în fiecare clipă a zilei.'
  };
};

const getDailyVerse = () => {
  const day = new Date().getDay();
  return verses[day % verses.length];
};

const renderHome = async () => {
  try {
    const [products, announcements] = await Promise.all([getProducts(), getAnnouncements()]);
    allProducts = products;
    allAnnouncements = announcements;

    // Urgent announcements
    const urgent = announcements.filter(a => a.type === 'urgent');
    const urgentTicker = document.getElementById('urgent-ticker');
    if (urgent.length > 0) {
      urgentTicker.style.display = 'block';
      const items = urgent.map(a => `<span class="ticker-item" onclick="openAnnouncementModal('${a.id}')">🔔 ${a.title}</span>`);
      document.getElementById('ticker-inner').innerHTML = [...items, ...items].join('<span style="color:gold;margin:0 20px">✝</span>');
    } else {
      urgentTicker.style.display = 'none';
    }

    // Featured announcement
    const featuredAnnounce = announcements[0];
    const announceEl = document.getElementById('home-announce');
    if (featuredAnnounce) {
      announceEl.innerHTML = `
        <div class="announce-card ${featuredAnnounce.type === 'urgent' ? 'urgent' : ''}" onclick="openAnnouncementModal('${featuredAnnounce.id}')">
          <span class="announce-badge badge-${featuredAnnounce.type || 'general'}">${getBadgeLabel(featuredAnnounce.type)}</span>
          <h3>${featuredAnnounce.title}</h3>
          <p class="announce-excerpt">${(featuredAnnounce.content || '').substring(0, 150)}${featuredAnnounce.content?.length > 150 ? '...' : ''}</p>
          <span class="announce-date">📅 ${formatDate(featuredAnnounce.createdAt)}</span>
        </div>`;
    }

    // Best selling product
    const bestProduct = products.find(p => p.bestSeller) || products[0];
    const bestProductEl = document.getElementById('home-best-product');
    if (bestProduct) {
      bestProductEl.innerHTML = `
        <div class="product-card" onclick="openProductModal('${bestProduct.id}')">
          <div class="product-img-wrap">
            ${bestProduct.images?.[0] ? `<img src="${bestProduct.images[0]}" alt="${bestProduct.name}">` : '<div class="product-img-placeholder">🕯️</div>'}
          </div>
          <div class="product-info">
            <div class="product-name">${bestProduct.name}</div>
            <div class="product-desc">${bestProduct.description || ''}</div>
            <div class="product-footer">
              <span class="product-price">${bestProduct.price} Lei</span>
              <button class="btn-add-cart" onclick="event.stopPropagation(); handleAddToCart('${bestProduct.id}')">🛒 Adaugă</button>
            </div>
          </div>
        </div>`;
    }

    // Saint of day
    const saint = getSaintOfDay();
    document.getElementById('home-saint').innerHTML = `
      <div class="saint-card">
        <div style="font-size:3rem;margin-bottom:15px">✝</div>
        <div class="saint-name">${saint.name}</div>
        <p class="saint-details">${saint.desc}</p>
      </div>`;

    // Daily verse
    const verse = getDailyVerse();
    document.getElementById('home-verse').innerHTML = `
      <div class="verse-box">
        <p>${verse.text}</p>
        <span class="verse-ref">— ${verse.ref}</span>
      </div>`;
  } catch (e) {
    console.error('Home render error:', e);
  }
};

const getBadgeLabel = (type) => {
  const map = { urgent: '🔴 URGENT', slujba: '⛪ Slujbă', general: '📋 General', eveniment: '📅 Eveniment', activitate: '🌿 Activitate' };
  return map[type] || 'General';
};

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
};

// ===== SHOP PAGE =====
let shopFilter = { category: 'all', search: '', sort: 'default' };

const renderShop = async () => {
  try {
    if (allProducts.length === 0) allProducts = await getProducts();
    applyShopFilters();
  } catch (e) { console.error('Shop error:', e); }
};

const applyShopFilters = () => {
  let filtered = [...allProducts];
  if (shopFilter.category !== 'all') filtered = filtered.filter(p => p.category === shopFilter.category);
  if (shopFilter.search) filtered = filtered.filter(p => p.name.toLowerCase().includes(shopFilter.search.toLowerCase()));
  if (shopFilter.sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (shopFilter.sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (shopFilter.sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  renderProductsGrid(filtered);
};

const renderProductsGrid = (products) => {
  const grid = document.getElementById('products-grid');
  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🕯️</div><h3>Nu există produse</h3><p>Nu am găsit produse care să corespundă filtrelor.</p></div>`;
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="product-card" onclick="openProductModal('${p.id}')">
      <div class="product-img-wrap">
        ${p.images?.[0] ? `<img src="${p.images[0]}" alt="${p.name}" loading="lazy">` : '<div class="product-img-placeholder">✝</div>'}
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-footer">
          <div>
            <div class="product-price">${p.price} Lei</div>
            <span class="stock-badge ${p.stock > 0 ? 'in-stock' : 'out-of-stock'}">${p.stock > 0 ? `${p.stock} buc.` : 'Epuizat'}</span>
          </div>
          <button class="btn-add-cart" onclick="event.stopPropagation(); handleAddToCart('${p.id}')" ${p.stock <= 0 ? 'disabled style="opacity:0.5"' : ''}>🛒 Adaugă</button>
        </div>
      </div>
    </div>`).join('');
};

window.handleAddToCart = (id) => {
  const p = allProducts.find(p => p.id === id);
  if (p) addToCart(p);
};

window.openProductModal = async (id) => {
  const p = allProducts.find(p => p.id === id) || await getProduct(id);
  if (!p) return;
  currentProductModal = p;

  const modal = document.getElementById('product-modal');
  document.getElementById('pm-title').textContent = p.name;
  document.getElementById('pm-price').textContent = `${p.price} Lei`;
  document.getElementById('pm-desc').innerHTML = p.description || '';
  document.getElementById('pm-stock').innerHTML = p.stock > 0 ? `<span class="stock-badge in-stock">✓ Disponibil (${p.stock} buc.)</span>` : '<span class="stock-badge out-of-stock">✗ Epuizat</span>';
  document.getElementById('pm-category').textContent = p.category || '';

  const imgs = p.images || [];
  if (imgs.length > 0) {
    document.getElementById('pm-main-img').src = imgs[0];
    document.getElementById('pm-main-img').style.display = 'block';
    document.getElementById('pm-thumbs').innerHTML = imgs.map((img, i) => `
      <img src="${img}" class="modal-thumb ${i === 0 ? 'active' : ''}" onclick="setModalMainImg('${img}', this)">`).join('');
  } else {
    document.getElementById('pm-main-img').style.display = 'none';
    document.getElementById('pm-thumbs').innerHTML = '<div style="text-align:center;padding:30px;font-size:4rem;color:var(--visniu-pale)">✝</div>';
  }

  document.getElementById('pm-qty').value = 1;
  modal.style.display = 'flex';
};

window.setModalMainImg = (src, el) => {
  document.getElementById('pm-main-img').src = src;
  document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
};

window.addModalToCart = () => {
  if (!currentProductModal) return;
  const qty = parseInt(document.getElementById('pm-qty').value) || 1;
  addToCart(currentProductModal, qty);
  closeModal('product-modal');
};

// ===== ANNOUNCEMENTS =====
window.openAnnouncementModal = async (id) => {
  const a = allAnnouncements.find(a => a.id === id);
  if (!a) return;

  document.getElementById('ann-title').textContent = a.title;
  document.getElementById('ann-badge').innerHTML = `<span class="announce-badge badge-${a.type || 'general'}">${getBadgeLabel(a.type)}</span>`;
  document.getElementById('ann-date').textContent = `📅 ${formatDate(a.createdAt)}`;
  document.getElementById('ann-content').innerHTML = (a.content || '').replace(/\n/g, '<br>');

  const imgEl = document.getElementById('ann-image');
  if (a.image) {
    imgEl.src = a.image;
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }

  document.getElementById('announcement-modal').style.display = 'flex';
};

const renderAnnouncements = async () => {
  try {
    if (allAnnouncements.length === 0) allAnnouncements = await getAnnouncements();
    const container = document.getElementById('announcements-list');
    const filter = document.getElementById('ann-filter')?.value || 'all';
    let filtered = allAnnouncements;
    if (filter !== 'all') filtered = filtered.filter(a => a.type === filter);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h3>Nu există anunțuri</h3></div>';
      return;
    }

    container.innerHTML = filtered.map(a => `
      <div class="announce-card ${a.type === 'urgent' ? 'urgent' : ''}" onclick="openAnnouncementModal('${a.id}')">
        <span class="announce-badge badge-${a.type || 'general'}">${getBadgeLabel(a.type)}</span>
        <h3>${a.title}</h3>
        <p class="announce-excerpt">${(a.content || '').substring(0, 200)}${(a.content || '').length > 200 ? '...' : ''}</p>
        <span class="announce-date">📅 ${formatDate(a.createdAt)}</span>
      </div>`).join('');
  } catch (e) { console.error('Announcements error:', e); }
};

// ===== CART PAGE =====
const renderCart = () => {
  const cartList = document.getElementById('cart-list');
  const cartSummary = document.getElementById('cart-summary');

  if (cart.length === 0) {
    cartList.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><h3>Coșul este gol</h3><p>Adaugă produse din magazin pentru a continua.</p><br><button class="btn btn-primary" onclick="showPage('shop')">Mergi la Magazin</button></div>`;
    cartSummary.style.display = 'none';
    return;
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  cartList.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${item.image ? `<img src="${item.image}" alt="${item.name}">` : '✝'}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div style="font-size:0.9rem;color:var(--text-light)">${item.price} Lei / buc.</div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
        </div>
      </div>
      <div class="cart-item-price">${(item.price * item.qty).toFixed(2)} Lei</div>
      <button class="cart-remove" onclick="removeFromCart('${item.id}')" title="Șterge">🗑️</button>
    </div>`).join('');

  cartSummary.style.display = 'block';
  document.getElementById('cart-total-val').textContent = `${total.toFixed(2)} Lei`;
};

// ===== CHECKOUT =====
window.showCheckout = () => {
  document.getElementById('cart-view').style.display = 'none';
  document.getElementById('checkout-view').style.display = 'block';
};

window.backToCart = () => {
  document.getElementById('cart-view').style.display = 'block';
  document.getElementById('checkout-view').style.display = 'none';
};

window.submitOrder = async () => {
  const name = document.getElementById('order-name').value.trim();
  const phone = document.getElementById('order-phone').value.trim();
  const email = document.getElementById('order-email').value.trim();
  const address = document.getElementById('order-address').value.trim();
  const county = document.getElementById('order-county').value.trim();
  const notes = document.getElementById('order-notes').value.trim();
  const payment = document.getElementById('order-payment').value;

  if (!name || !phone || !address) { showToast('⚠️ Completați câmpurile obligatorii!'); return; }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  try {
    document.getElementById('btn-submit-order').disabled = true;
    document.getElementById('btn-submit-order').textContent = 'Se procesează...';
    await addOrder({ name, phone, email, address, county, notes, payment, items: [...cart], total: total.toFixed(2), status: 'noua' });
    cart = [];
    saveCart();
    updateCartBadge();
    showPage('home');
    setTimeout(() => showToast('✝ Comandă plasată cu succes! Vă mulțumim!', 5000), 300);
  } catch (e) {
    showToast('❌ Eroare la plasarea comenzii. Încercați din nou.');
    document.getElementById('btn-submit-order').disabled = false;
    document.getElementById('btn-submit-order').textContent = 'Finalizează Comanda';
  }
};

// ===== ADMIN =====
const showAdminLogin = () => {
  document.getElementById('admin-login-view').style.display = 'flex';
  document.getElementById('admin-panel-view').style.display = 'none';
};

const showAdminPanel = () => {
  document.getElementById('admin-login-view').style.display = 'none';
  document.getElementById('admin-panel-view').style.display = 'flex';
};

window.adminLogin = async () => {
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;
  const btn = document.getElementById('admin-login-btn');
  btn.disabled = true;
  btn.textContent = 'Se conectează...';
  try {
    await loginAdmin(email, password);
    showAdminPanel();
    renderAdminSection('dashboard');
  } catch (e) {
    document.getElementById('admin-login-error').textContent = 'Email sau parolă incorectă.';
    document.getElementById('admin-login-error').style.display = 'block';
  }
  btn.disabled = false;
  btn.textContent = 'Conectare';
};

window.adminLogout = async () => {
  await logoutAdmin();
  showAdminLogin();
};

window.renderAdminSection = async (section) => {
  currentAdminSection = section;
  document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.admin-nav-item[data-section="${section}"]`)?.classList.add('active');
  const content = document.getElementById('admin-main');

  if (section === 'dashboard') await renderAdminDashboard(content);
  if (section === 'orders') await renderAdminOrders(content);
  if (section === 'products') await renderAdminProducts(content);
  if (section === 'announcements') await renderAdminAnnouncements(content);
};

const renderAdminDashboard = async (el) => {
  el.innerHTML = '<div class="loading"><div class="spinner"></div> Se încarcă...</div>';
  try {
    const [orders, products, announcements] = await Promise.all([getOrders(), getProducts(), getAnnouncements()]);
    allOrders = orders;
    allProducts = products;
    allAnnouncements = announcements;

    const totalRevenue = orders.filter(o => o.status !== 'anulata').reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const newOrders = orders.filter(o => o.status === 'noua').length;

    el.innerHTML = `
      <h2 style="font-family:'Cinzel',serif;color:var(--visniu);margin-bottom:30px;font-size:1.5rem">📊 Panou de Control</h2>
      <div class="grid-3" style="margin-bottom:35px">
        <div class="admin-stat-card">
          <div class="admin-stat-num">${orders.length}</div>
          <div class="admin-stat-label">Total Comenzi</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-num">${newOrders}</div>
          <div class="admin-stat-label">Comenzi Noi</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-num">${totalRevenue.toFixed(0)} Lei</div>
          <div class="admin-stat-label">Venituri Totale</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-num">${products.length}</div>
          <div class="admin-stat-label">Produse</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-num">${announcements.length}</div>
          <div class="admin-stat-label">Anunțuri</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-num">${announcements.filter(a=>a.type==='urgent').length}</div>
          <div class="admin-stat-label">Anunțuri Urgente</div>
        </div>
      </div>
      <h3 style="font-family:'Cinzel',serif;color:var(--visniu);margin-bottom:15px">Comenzi Recente</h3>
      <table class="admin-table">
        <thead><tr><th>#</th><th>Client</th><th>Total</th><th>Status</th><th>Data</th></tr></thead>
        <tbody>${orders.slice(0, 5).map(o => `
          <tr onclick="renderAdminOrderDetail('${o.id}')" style="cursor:pointer">
            <td style="font-family:monospace;font-size:0.8rem">${o.id.substring(0,8)}...</td>
            <td>${o.name}</td>
            <td>${o.total} Lei</td>
            <td><span class="status-badge status-${o.status}">${o.status?.toUpperCase()}</span></td>
            <td>${formatDate(o.createdAt)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) { el.innerHTML = '<p style="color:red">Eroare la încărcare.</p>'; }
};

const renderAdminOrders = async (el) => {
  el.innerHTML = '<div class="loading"><div class="spinner"></div> Se încarcă comenzile...</div>';
  try {
    allOrders = await getOrders();
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:25px;flex-wrap:wrap;gap:15px">
        <h2 style="font-family:'Cinzel',serif;color:var(--visniu);font-size:1.5rem">📦 Comenzi</h2>
        <button class="btn btn-primary btn-sm" onclick="renderAdminAddOrder()">+ Comandă Nouă</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Client</th><th>Telefon</th><th>Total</th><th>Status</th><th>Data</th><th>Acțiuni</th></tr></thead>
        <tbody>${allOrders.map(o => `
          <tr>
            <td style="font-family:monospace;font-size:0.75rem;cursor:pointer" onclick="renderAdminOrderDetail('${o.id}')">${o.id.substring(0,10)}...</td>
            <td><strong>${o.name}</strong></td>
            <td>${o.phone}</td>
            <td><strong>${o.total} Lei</strong></td>
            <td>
              <select class="form-control" style="padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:0.8rem" onchange="changeOrderStatus('${o.id}', this.value)">
                ${['noua','procesata','livrata','anulata'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s.toUpperCase()}</option>`).join('')}
              </select>
            </td>
            <td>${formatDate(o.createdAt)}</td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="renderAdminOrderDetail('${o.id}')" style="margin-right:5px">👁️</button>
              <button class="btn btn-danger btn-sm" onclick="confirmDeleteOrder('${o.id}')">🗑️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) { el.innerHTML = '<p style="color:red">Eroare.</p>'; }
};

window.renderAdminOrderDetail = async (id) => {
  const el = document.getElementById('admin-main');
  el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const o = await getOrder(id);
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:15px;margin-bottom:25px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="renderAdminSection('orders')">← Înapoi</button>
        <h2 style="font-family:'Cinzel',serif;color:var(--visniu)">Comandă #${o.id.substring(0,8)}</h2>
        <span class="status-badge status-${o.status}">${o.status?.toUpperCase()}</span>
      </div>
      <div class="order-detail-grid">
        <div class="info-box">
          <h4>Date Client</h4>
          <div class="info-row"><span class="label">Nume</span><span class="value">${o.name}</span></div>
          <div class="info-row"><span class="label">Telefon</span><span class="value">${o.phone}</span></div>
          <div class="info-row"><span class="label">Email</span><span class="value">${o.email || '-'}</span></div>
        </div>
        <div class="info-box">
          <h4>Livrare</h4>
          <div class="info-row"><span class="label">Adresă</span><span class="value">${o.address}</span></div>
          <div class="info-row"><span class="label">Județ</span><span class="value">${o.county || '-'}</span></div>
          <div class="info-row"><span class="label">Plată</span><span class="value">${o.payment || 'Ramburs'}</span></div>
        </div>
      </div>
      ${o.notes ? `<div class="info-box" style="margin-bottom:20px"><h4>Observații</h4><p>${o.notes}</p></div>` : ''}
      <div class="info-box">
        <h4>Produse Comandate</h4>
        ${(o.items || []).map(item => `
          <div class="info-row">
            <span class="label">${item.name} x${item.qty}</span>
            <span class="value">${(item.price * item.qty).toFixed(2)} Lei</span>
          </div>`).join('')}
        <div class="info-row" style="font-size:1.1rem;font-weight:700;border-top:2px solid var(--visniu-pale);padding-top:10px;margin-top:5px">
          <span class="label">TOTAL</span>
          <span class="value" style="color:var(--visniu)">${o.total} Lei</span>
        </div>
      </div>
      <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
        <select id="detail-status" style="padding:10px 15px;border:2px solid var(--cream-dark);border-radius:6px;font-family:inherit">
          ${['noua','procesata','livrata','anulata'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${s.toUpperCase()}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="saveOrderStatus('${o.id}')">Salvează Status</button>
        <button class="btn btn-danger" onclick="confirmDeleteOrder('${o.id}')">🗑️ Șterge Comanda</button>
      </div>`;
  } catch (e) { el.innerHTML = '<p style="color:red">Eroare.</p>'; }
};

window.saveOrderStatus = async (id) => {
  const status = document.getElementById('detail-status').value;
  await updateOrder(id, { status });
  showToast('✅ Status actualizat!');
};

window.changeOrderStatus = async (id, status) => {
  await updateOrder(id, { status });
  showToast('✅ Status actualizat!');
};

window.confirmDeleteOrder = async (id) => {
  if (confirm('Ești sigur că vrei să ștergi această comandă?')) {
    await deleteOrder(id);
    showToast('🗑️ Comandă ștearsă!');
    renderAdminSection('orders');
  }
};

window.renderAdminAddOrder = () => {
  const el = document.getElementById('admin-main');
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:15px;margin-bottom:25px">
      <button class="btn btn-outline btn-sm" onclick="renderAdminSection('orders')">← Înapoi</button>
      <h2 style="font-family:'Cinzel',serif;color:var(--visniu)">Adaugă Comandă Manuală</h2>
    </div>
    <div class="admin-form">
      <div class="form-row">
        <div class="form-group"><label>Nume *</label><input id="ao-name" placeholder="Nume client"></div>
        <div class="form-group"><label>Telefon *</label><input id="ao-phone" placeholder="Telefon"></div>
      </div>
      <div class="form-group"><label>Email</label><input id="ao-email" type="email" placeholder="Email"></div>
      <div class="form-group"><label>Adresă *</label><input id="ao-address" placeholder="Strada, nr, bloc, ap..."></div>
      <div class="form-row">
        <div class="form-group"><label>Județ</label><input id="ao-county" placeholder="Județ"></div>
        <div class="form-group"><label>Metodă Plată</label>
          <select id="ao-payment"><option value="ramburs">Ramburs</option><option value="transfer">Transfer bancar</option><option value="card">Card online</option></select>
        </div>
      </div>
      <div class="form-group"><label>Total (Lei) *</label><input id="ao-total" type="number" placeholder="0.00"></div>
      <div class="form-group"><label>Observații</label><textarea id="ao-notes" rows="3" placeholder="Note suplimentare..."></textarea></div>
      <button class="btn btn-primary" onclick="saveManualOrder()">Adaugă Comanda</button>
    </div>`;
};

window.saveManualOrder = async () => {
  const name = document.getElementById('ao-name').value.trim();
  const phone = document.getElementById('ao-phone').value.trim();
  const address = document.getElementById('ao-address').value.trim();
  const total = document.getElementById('ao-total').value;
  if (!name || !phone || !address || !total) { showToast('⚠️ Completați câmpurile obligatorii!'); return; }
  await addOrder({
    name, phone,
    email: document.getElementById('ao-email').value,
    address,
    county: document.getElementById('ao-county').value,
    payment: document.getElementById('ao-payment').value,
    total: parseFloat(total).toFixed(2),
    notes: document.getElementById('ao-notes').value,
    items: []
  });
  showToast('✅ Comandă adăugată!');
  renderAdminSection('orders');
};

// ===== ADMIN PRODUCTS =====
const renderAdminProducts = async (el) => {
  el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    allProducts = await getProducts();
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:25px;flex-wrap:wrap;gap:15px">
        <h2 style="font-family:'Cinzel',serif;color:var(--visniu);font-size:1.5rem">🕯️ Produse</h2>
        <button class="btn btn-primary btn-sm" onclick="renderAdminProductForm()">+ Produs Nou</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>Img</th><th>Nume</th><th>Categorie</th><th>Preț</th><th>Stoc</th><th>Acțiuni</th></tr></thead>
        <tbody>${allProducts.map(p => `
          <tr>
            <td><img src="${p.images?.[0] || ''}" class="product-img-small" onerror="this.style.display='none'" ${!p.images?.[0] ? 'style="display:none"' : ''}></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.category || '-'}</td>
            <td><strong>${p.price} Lei</strong></td>
            <td><span class="stock-badge ${p.stock > 0 ? 'in-stock' : 'out-of-stock'}">${p.stock || 0}</span></td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="renderAdminProductForm('${p.id}')" style="margin-right:5px">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="confirmDeleteProduct('${p.id}')">🗑️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) { el.innerHTML = '<p style="color:red">Eroare.</p>'; }
};

window.renderAdminProductForm = async (id) => {
  const el = document.getElementById('admin-main');
  editingProductId = id || null;
  selectedProductImages = [];

  let p = { name: '', price: '', category: '', description: '', stock: 0, images: [], bestSeller: false };
  if (id) {
    p = allProducts.find(x => x.id === id) || await getProduct(id);
    selectedProductImages = [...(p.images || [])];
  }

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:15px;margin-bottom:25px">
      <button class="btn btn-outline btn-sm" onclick="renderAdminSection('products')">← Înapoi</button>
      <h2 style="font-family:'Cinzel',serif;color:var(--visniu)">${id ? 'Editează' : 'Adaugă'} Produs</h2>
    </div>
    <div class="admin-form">
      <div class="form-row">
        <div class="form-group"><label>Nume Produs *</label><input id="p-name" value="${p.name || ''}" placeholder="ex: Lumânare pascală"></div>
        <div class="form-group"><label>Preț (Lei) *</label><input id="p-price" type="number" value="${p.price || ''}" placeholder="0.00"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Categorie</label>
          <select id="p-category">
            <option value="">Selectează...</option>
            ${['Lumânări','Icoane','Cărți','Cruci','Tămâie','Mir','Alte obiecte'].map(c => `<option value="${c}" ${p.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Stoc (bucăți)</label><input id="p-stock" type="number" value="${p.stock || 0}"></div>
      </div>
      <div class="form-group"><label>Descriere</label><textarea id="p-desc" rows="4" placeholder="Descriere produs...">${p.description || ''}</textarea></div>
      <div class="form-group">
        <label><input type="checkbox" id="p-bestseller" ${p.bestSeller?'checked':''}> Marchează ca Cel Mai Vândut</label>
      </div>
      <div class="form-group">
        <label>Fotografii Produs</label>
        <div class="upload-zone" onclick="document.getElementById('p-img-input').click()" id="product-upload-zone">
          <div style="font-size:2rem;color:var(--visniu-pale);margin-bottom:10px">📷</div>
          <p style="color:var(--text-light);font-size:0.9rem">Click pentru a adăuga fotografii<br><small>JPG, PNG, WebP - max 5MB</small></p>
          <input type="file" id="p-img-input" multiple accept="image/*" style="display:none" onchange="handleProductImages(event)">
        </div>
        <div id="product-img-previews" class="upload-preview" style="margin-top:15px"></div>
      </div>
      <button class="btn btn-primary" onclick="saveProduct()" id="save-product-btn">${id ? 'Actualizează' : 'Adaugă'} Produs</button>
    </div>`;

  renderProductImagePreviews();
};

const renderProductImagePreviews = () => {
  const cont = document.getElementById('product-img-previews');
  if (!cont) return;
  cont.innerHTML = selectedProductImages.map((img, i) => `
    <div style="position:relative;display:inline-block">
      <img src="${typeof img === 'string' ? img : URL.createObjectURL(img)}" class="upload-preview-img">
      <button onclick="removeProductImage(${i})" style="position:absolute;top:-5px;right:-5px;background:#C0392B;color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:0.7rem;display:flex;align-items:center;justify-content:center">✕</button>
    </div>`).join('');
};

window.handleProductImages = (e) => {
  const files = Array.from(e.target.files);
  selectedProductImages = [...selectedProductImages, ...files];
  renderProductImagePreviews();
};

window.removeProductImage = (i) => {
  selectedProductImages.splice(i, 1);
  renderProductImagePreviews();
};

window.saveProduct = async () => {
  const name = document.getElementById('p-name').value.trim();
  const price = parseFloat(document.getElementById('p-price').value);
  if (!name || !price) { showToast('⚠️ Completați câmpurile obligatorii!'); return; }

  const btn = document.getElementById('save-product-btn');
  btn.disabled = true;
  btn.textContent = 'Se salvează...';

  try {
    // Upload new images (File objects)
    const finalImages = [];
    for (const img of selectedProductImages) {
      if (typeof img === 'string') { finalImages.push(img); continue; }
      const url = await uploadImage(img, `produse/${Date.now()}_${img.name}`);
      finalImages.push(url);
    }

    const data = {
      name,
      price,
      category: document.getElementById('p-category').value,
      stock: parseInt(document.getElementById('p-stock').value) || 0,
      description: document.getElementById('p-desc').value,
      bestSeller: document.getElementById('p-bestseller').checked,
      images: finalImages
    };

    if (editingProductId) await updateProduct(editingProductId, data);
    else await addProduct(data);

    showToast(editingProductId ? '✅ Produs actualizat!' : '✅ Produs adăugat!');
    renderAdminSection('products');
  } catch (e) {
    showToast('❌ Eroare la salvare: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Salvează';
  }
};

window.confirmDeleteProduct = async (id) => {
  if (confirm('Ești sigur că vrei să ștergi acest produs?')) {
    await deleteProduct(id);
    showToast('🗑️ Produs șters!');
    renderAdminSection('products');
  }
};

// ===== ADMIN ANNOUNCEMENTS =====
const renderAdminAnnouncements = async (el) => {
  el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    allAnnouncements = await getAnnouncements();
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:25px;flex-wrap:wrap;gap:15px">
        <h2 style="font-family:'Cinzel',serif;color:var(--visniu);font-size:1.5rem">📋 Anunțuri</h2>
        <button class="btn btn-primary btn-sm" onclick="renderAdminAnnouncementForm()">+ Anunț Nou</button>
      </div>
      <table class="admin-table">
        <thead><tr><th>Titlu</th><th>Tip</th><th>Data</th><th>Acțiuni</th></tr></thead>
        <tbody>${allAnnouncements.map(a => `
          <tr>
            <td><strong>${a.title}</strong></td>
            <td><span class="announce-badge badge-${a.type}">${getBadgeLabel(a.type)}</span></td>
            <td>${formatDate(a.createdAt)}</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="renderAdminAnnouncementForm('${a.id}')" style="margin-right:5px">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="confirmDeleteAnnouncement('${a.id}')">🗑️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) { el.innerHTML = '<p style="color:red">Eroare.</p>'; }
};

window.renderAdminAnnouncementForm = async (id) => {
  const el = document.getElementById('admin-main');
  editingAnnouncementId = id || null;
  selectedAnnouncementImages = [];

  let a = { title: '', type: 'general', content: '', image: '' };
  if (id) {
    a = allAnnouncements.find(x => x.id === id) || a;
    if (a.image) selectedAnnouncementImages = [a.image];
  }

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:15px;margin-bottom:25px">
      <button class="btn btn-outline btn-sm" onclick="renderAdminSection('announcements')">← Înapoi</button>
      <h2 style="font-family:'Cinzel',serif;color:var(--visniu)">${id ? 'Editează' : 'Adaugă'} Anunț</h2>
    </div>
    <div class="admin-form">
      <div class="form-group"><label>Titlu *</label><input id="a-title" value="${a.title || ''}" placeholder="Titlul anunțului"></div>
      <div class="form-group"><label>Tip Anunț</label>
        <select id="a-type">
          ${['urgent','slujba','general','eveniment','activitate'].map(t => `<option value="${t}" ${a.type===t?'selected':''}>${getBadgeLabel(t)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Conținut *</label><textarea id="a-content" rows="8" placeholder="Conținutul anunțului...">${a.content || ''}</textarea></div>
      <div class="form-group">
        <label>Fotografie Anunț</label>
        <div class="upload-zone" onclick="document.getElementById('a-img-input').click()">
          <div style="font-size:2rem;color:var(--visniu-pale);margin-bottom:10px">🖼️</div>
          <p style="color:var(--text-light);font-size:0.9rem">Click pentru a adăuga o fotografie</p>
          <input type="file" id="a-img-input" accept="image/*" style="display:none" onchange="handleAnnouncementImage(event)">
        </div>
        <div id="ann-img-preview" style="margin-top:15px">${a.image ? `<div style="position:relative;display:inline-block"><img src="${a.image}" style="width:120px;height:90px;object-fit:cover;border-radius:8px"><button onclick="clearAnnImage()" style="position:absolute;top:-5px;right:-5px;background:#C0392B;color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer">✕</button></div>` : ''}</div>
      </div>
      <button class="btn btn-primary" onclick="saveAnnouncement()" id="save-ann-btn">${id ? 'Actualizează' : 'Publică'} Anunțul</button>
    </div>`;
};

window.handleAnnouncementImage = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedAnnouncementImages = [file];
  const url = URL.createObjectURL(file);
  document.getElementById('ann-img-preview').innerHTML = `<div style="position:relative;display:inline-block"><img src="${url}" style="width:120px;height:90px;object-fit:cover;border-radius:8px"><button onclick="clearAnnImage()" style="position:absolute;top:-5px;right:-5px;background:#C0392B;color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer">✕</button></div>`;
};

window.clearAnnImage = () => {
  selectedAnnouncementImages = [];
  document.getElementById('ann-img-preview').innerHTML = '';
};

window.saveAnnouncement = async () => {
  const title = document.getElementById('a-title').value.trim();
  const content = document.getElementById('a-content').value.trim();
  if (!title || !content) { showToast('⚠️ Completați câmpurile obligatorii!'); return; }

  const btn = document.getElementById('save-ann-btn');
  btn.disabled = true;
  btn.textContent = 'Se salvează...';

  try {
    let imageUrl = '';
    if (selectedAnnouncementImages.length > 0) {
      const img = selectedAnnouncementImages[0];
      if (typeof img === 'string') imageUrl = img;
      else imageUrl = await uploadImage(img, `anunturi/${Date.now()}_${img.name}`);
    }

    const data = { title, type: document.getElementById('a-type').value, content, image: imageUrl };

    if (editingAnnouncementId) await updateAnnouncement(editingAnnouncementId, data);
    else await addAnnouncement(data);

    showToast(editingAnnouncementId ? '✅ Anunț actualizat!' : '✅ Anunț publicat!');
    renderAdminSection('announcements');
  } catch (e) {
    showToast('❌ Eroare: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Salvează';
  }
};

window.confirmDeleteAnnouncement = async (id) => {
  if (confirm('Ești sigur că vrei să ștergi acest anunț?')) {
    await deleteAnnouncement(id);
    showToast('🗑️ Anunț șters!');
    renderAdminSection('announcements');
  }
};

// ===== MODALS =====
window.closeModal = (id) => {
  document.getElementById(id).style.display = 'none';
};

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) e.target.style.display = 'none';
});

// ===== INIT =====
const init = async () => {
  startEasterTimer();
  updateCartBadge();

  // Auth listener
  onAuthChange((user) => {
    currentAdmin = user;
    if (user && document.getElementById('page-admin').classList.contains('active')) {
      showAdminPanel();
      renderAdminSection('dashboard');
    }
  });

  // Navigation
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(el.dataset.page);
    });
  });

  // Cart icon
  document.getElementById('cart-icon').addEventListener('click', () => showPage('cart'));

  // Hamburger
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('nav-links').classList.toggle('open');
  });

  // Filter buttons
  document.getElementById('btn-shop-filters')?.addEventListener('click', () => {
    const panel = document.getElementById('shop-filters-panel');
    panel.classList.toggle('open');
    document.getElementById('btn-shop-filters').classList.toggle('active');
  });

  // Filter chips
  document.querySelectorAll('.shop-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.type;
      const val = chip.dataset.val;
      document.querySelectorAll(`.shop-filter-chip[data-type="${type}"]`).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      shopFilter[type] = val;
      applyShopFilters();
    });
  });

  // Search
  document.getElementById('shop-search')?.addEventListener('input', (e) => {
    shopFilter.search = e.target.value;
    applyShopFilters();
  });

  // Announcement filter
  document.getElementById('ann-filter')?.addEventListener('change', () => renderAnnouncements());

  // Load home
  showPage('home');
  window.showPage = showPage;
};

window.addEventListener('DOMContentLoaded', init);
window.showPage = showPage;
window.updateCartQty = updateCartQty;
window.removeFromCart = removeFromCart;
