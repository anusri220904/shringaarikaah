// ====== CONFIG ======
const WHATSAPP_NUMBER = "919876543210"; // <-- change to your full WhatsApp number without '+'

// ====== Utilities ======
const fmtINR = (n) => `₹${n.toLocaleString('en-IN')}`;
const qs = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function getCart(){
  try { return JSON.parse(localStorage.getItem('cart')||'[]'); } catch(e){ return []; }
}
function setCart(cart){
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount(){
  const count = getCart().reduce((a,i)=>a+i.qty,0);
  const el = qs('#cart-count');
  if(el) el.textContent = count;
}

// Add item to cart
function addToCart(id, qty=1){
  const cart = getCart();
  const found = cart.find(i=>i.id===id);
  if(found){ found.qty += qty; } else { cart.push({id, qty}); }
  setCart(cart);
  // simple non-blocking feedback
  const previous = document.activeElement;
  alert('Added to cart');
  if(previous) previous.focus();
}

// Remove item
function removeFromCart(id){
  setCart(getCart().filter(i=>i.id!==id));
}

// Update quantity
function updateQty(id, qty){
  const cart = getCart();
  const item = cart.find(i=>i.id===id);
  if(item){
    item.qty = Math.max(1, parseInt(qty||1,10));
    setCart(cart);
  }
}

// Find product by ID
function productById(id){
  return window.PRODUCTS.find(p=>p.id===id);
}

// Render stars (textual)
function renderStars(rating){
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return '★'.repeat(full) + (half?'½':'') + '☆'.repeat(5 - full - (half?1:0));
}

// ====== Home: Best Sellers & Carousel ======
function renderBestSellers(){
  const wrap = qs('#bestSellers');
  if(!wrap) return;
  const best = window.PRODUCTS.filter(p=>p.bestSeller);
  wrap.innerHTML = best.map(p => cardHTML(p)).join('');
  attachCardEvents(wrap);
}

// Simple auto-scrolling carousel
function initCarousel(){
  const car = qs('#heroCarousel');
  if(!car) return;
  let idx = 0;
  setInterval(()=>{
    if(!car.children.length) return;
    idx = (idx + 1) % car.children.length;
    car.scrollTo({left: car.children[idx].offsetLeft - 16, behavior:'smooth'});
  }, 3500);
  qsa('.carousel .slide').forEach(sl => {
    sl.addEventListener('click', () => {
      const link = sl.getAttribute('data-link');
      if(link) location.href = link;
    });
  });
}

// ====== Category pages ======
function renderCategoryPage(){
  const body = document.body;
  if(body.dataset.page !== 'category') return;
  const cat = body.dataset.category;
  const grid = qs('#productsGrid');
  const sortSel = qs('#sortSelect');
  const ratingFilter = qs('#ratingFilter');
  let items = window.PRODUCTS.filter(p=>p.category===cat);

  function apply(){
    let list = items.filter(p => p.rating >= parseFloat(ratingFilter.value||0));
    const sort = sortSel.value;
    if(sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
    else if(sort === 'price-desc') list.sort((a,b)=>b.price-a.price);
    else if(sort === 'rating') list.sort((a,b)=>b.rating-a.rating);
    else if(sort === 'newest') list.sort((a,b)=> new Date(b.newest) - new Date(a.newest));
    else list.sort((a,b)=> (b.bestSeller - a.bestSeller) || (b.rating - a.rating));
    grid.innerHTML = list.map(cardHTML).join('');
    attachCardEvents(grid);
  }

  sortSel.addEventListener('change', apply);
  ratingFilter.addEventListener('change', apply);
  apply();
}

// Card HTML
function cardHTML(p){
  return `
  <article class="card">
    <div class="card-media">
      <img src="${p.images[0]}" alt="${p.name}">
    </div>
    <div class="card-body">
      <div class="name">${p.name}</div>
      <div class="stars" title="${p.rating}">${renderStars(p.rating)}</div>
      <div class="price">${fmtINR(p.price)}</div>
      <div class="card-actions">
        <a href="product-detail.html?id=${p.id}" class="btn">View</a>
        <button class="btn btn-primary" data-add="${p.id}">Add to Cart</button>
      </div>
    </div>
  </article>`;
}

// Attach add-to-cart events
function attachCardEvents(root=document){
  qsa('[data-add]', root).forEach(btn=>{
    btn.addEventListener('click', ()=> addToCart(btn.dataset.add, 1));
  });
}

// ====== Product Detail ======
function renderProductDetail(){
  if(document.body.dataset.page !== 'product-detail') return;
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const p = productById(id);
  const wrap = qs('#productDetail');
  if(!p){
    wrap.innerHTML = '<p>Product not found.</p>';
    return;
  }
  wrap.innerHTML = `
    <div class="gallery">
      <div class="gallery-main"><img id="mainImg" src="${p.images[0]}" alt="${p.name}"></div>
      <div class="gallery-thumbs">
        ${p.images.map((src,i)=>`<div class="thumb"><img data-idx="${i}" src="${src}" alt="thumb ${i}"></div>`).join('')}
      </div>
    </div>
    <div class="detail-info">
      <h1>${p.name}</h1>
      <div class="stars" title="${p.rating}">${renderStars(p.rating)}</div>
      <div class="detail-price">${fmtINR(p.price)}</div>
      <p class="detail-meta">Category: ${p.category.toUpperCase()} • New: ${new Date(p.newest).toLocaleDateString()}</p>
      <p>${p.description}</p>
      <div class="card-actions">
        <button class="btn btn-primary" id="addDetail">Add to Cart</button>
      </div>
    </div>
  `;
  qsa('.gallery-thumbs img', wrap).forEach(img => {
    img.addEventListener('click', () => {
      qs('#mainImg').src = p.images[parseInt(img.dataset.idx,10)];
    });
  });
  qs('#addDetail').addEventListener('click', () => addToCart(p.id, 1));
}

// ====== Cart Page ======
function renderCart(){
  if(document.body.dataset.page !== 'cart') return;
  const cont = qs('#cartItems');
  const cart = getCart();
  if(cart.length === 0){
    cont.innerHTML = '<p>Your cart is empty.</p>';
    qs('#subtotal').textContent = fmtINR(0);
    qs('#tax').textContent = fmtINR(0);
    qs('#total').textContent = fmtINR(0);
    return;
  }
  let subtotal = 0;
  cont.innerHTML = cart.map(item => {
    const p = productById(item.id);
    if(!p) return '';
    const line = p.price * item.qty;
    subtotal += line;
    return `
      <div class="cart-item" data-id="${p.id}">
        <img src="${p.images[0]}" alt="${p.name}" width="86" height="86">
        <div>
          <div><strong>${p.name}</strong></div>
          <div class="muted">${fmtINR(p.price)} each</div>
          <button class="remove" data-remove="${p.id}">Remove</button>
        </div>
        <div class="qty">
          <label class="muted small">Qty</label>
          <input type="number" min="1" value="${item.qty}" data-qty="${p.id}">
        </div>
      </div>
    `;
  }).join('');

  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  qs('#subtotal').textContent = fmtINR(subtotal);
  qs('#tax').textContent = fmtINR(tax);
  qs('#total').textContent = fmtINR(total);

  // Events
  qsa('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
    removeFromCart(btn.dataset.remove);
    renderCart();
  }));
  qsa('[data-qty]').forEach(inp => inp.addEventListener('change', () => {
    updateQty(inp.dataset.qty, parseInt(inp.value,10));
    renderCart();
  }));

  // WhatsApp
  qs('#whatsappOrderBtn').addEventListener('click', () => {
    const lines = getCart().map(ci => {
      const p = productById(ci.id);
      return `• ${p.name} (x${ci.qty}) — ${fmtINR(p.price * ci.qty)}`;
    });
    const message = [
      "Hello Shringarikaah, I'd like to place this order:",
      "",
      ...lines,
      "",
      `Total: ${qs('#total').textContent}`,
      "",
      "Name: ",
      "Address: ",
      "Pincode: ",
      "Phone: "
    ].join('\n');
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  });
}

// ====== Header on all pages: initialize ======
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  renderBestSellers();
  initCarousel();
  renderCategoryPage();
  renderProductDetail();
  renderCart();
});
