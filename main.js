(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const readSession = (key, fallback) => {
    try {
      const value = sessionStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const databaseRequest = async (path, options = {}) => {
    const headers = { ...options.headers };
    if (options.body) headers['Content-Type'] = 'application/json';
    const response = await fetch(`http://localhost:3000${path}`, {
      ...options,
      headers
    });
    if (!response.ok) throw new Error(`Database request failed (${response.status}).`);
    return response.status === 204 ? null : response.json();
  };
  const database = {
    request: databaseRequest,
    currentUser: () => read('store_user', null) || readSession('store_user', null),
    usersByEmail: email => databaseRequest(`/users?email=${encodeURIComponent(email)}`),
    getCart: async email => {
      const carts = await databaseRequest(`/carts?userEmail=${encodeURIComponent(email)}`);
      return carts[0] || null;
    },
    saveCart: async (email, items) => {
      const cart = await database.getCart(email);
      const productsById = new Map(products().map(product => [product.id, product]));
      const savedItems = items.map(item => {
        const product = productsById.get(item.id);
        return product
          ? { ...item, name: product.name, brand: product.brand, price: product.price }
          : item;
      });
      const data = { userEmail: email, items: savedItems, updatedAt: new Date().toISOString() };
      return cart
        ? databaseRequest(`/carts/${encodeURIComponent(cart.id)}`, { method: 'PUT', body: JSON.stringify({ ...data, id: cart.id }) })
        : databaseRequest('/carts', { method: 'POST', body: JSON.stringify(data) });
    },
    syncCart: async email => {
      const savedCart = await database.getCart(email);
      const merged = new Map((savedCart?.items || []).map(item => [item.id, Number(item.quantity) || 0]));
      read('store_cart', []).forEach(item => merged.set(item.id, Math.min(99, (merged.get(item.id) || 0) + Number(item.quantity || 0))));
      const items = [...merged].map(([id, quantity]) => ({ id, quantity }));
      await database.saveCart(email, items);
      localStorage.setItem('store_cart', JSON.stringify(items));
      const savedOrders = await databaseRequest(`/orders?userEmail=${encodeURIComponent(email)}`);
      const savedOrderIds = new Set(savedOrders.map(order => order.id));
      const previousOrders = read('store_orders', []).filter(order =>
        order.customer?.email?.toLowerCase() === email && !savedOrderIds.has(order.id)
      );
      for (const order of previousOrders) {
        await database.saveOrder({ ...order, userEmail: email });
      }
    },
    saveOrder: order => databaseRequest('/orders', { method: 'POST', body: JSON.stringify(order) })
  };
  const money = value => new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
  const products = () => {
    const list = read('store_products', window.STORE_PRODUCTS);
    const orders = read('store_orders', []);
    return list.map(product => {
      const defaultImage = window.STORE_PRODUCTS.find(item => item.id === product.id)?.image;
      const sold = orders
        .filter(order => order.status !== 'Đã hủy')
        .flatMap(order => order.items || [])
        .filter(item => item.id === product.id || (!item.id && item.name === product.name))
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return {
        ...product,
        image: defaultImage && (!product.image || product.image.includes('images.unsplash.com'))
          ? defaultImage
          : product.image,
        stock: Number.isFinite(Number(product.stock)) ? Math.max(0, Number(product.stock)) : Math.max(0, 20 - sold)
      };
    });
  };
  const categories = () => read('store_categories', window.STORE_CATEGORIES)
    .map(category => typeof category === 'string' ? category : category.name);
  window.storeUtils = { $, money, products, categories };
  window.storeDatabase = database;

  const fallbackImage = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#edf0f4"/><g fill="none" stroke="#3159d9" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><rect x="159" y="54" width="82" height="192" rx="14"/><path d="M183 75h34M191 224h18"/></g><text x="200" y="278" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#68717e">mobi+</text></svg>'
  )}`;
  document.addEventListener('error', event => {
    const image = event.target;
    if (image instanceof HTMLImageElement && image.src !== fallbackImage) image.src = fallbackImage;
  }, true);

  function header() {
    const target = $('[data-site-header]');
    if (!target) return;
    const count = () => read('store_cart', []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const user = read('store_user', null) || readSession('store_user', null);
    target.innerHTML = `<div class="topline">Giao hàng miễn phí đơn từ 1.000.000đ · Đổi trả trong 30 ngày</div><div class="site-header"><div class="wrap nav"><button class="mobile-menu" aria-label="Mở menu" aria-expanded="false">☰</button><a class="brand" href="index.html">mobi<span>+</span></a><nav class="nav-links"><a href="index.html">Trang chủ</a><a href="products.html">Sản phẩm</a><a href="products.html?category=Điện%20thoại">Điện thoại</a><a href="products.html?category=Phụ%20kiện">Phụ kiện</a></nav><div class="nav-tools"><form class="searchbar" action="products.html"><span aria-hidden="true">⌕</span><input name="q" placeholder="Tìm sản phẩm" aria-label="Tìm sản phẩm"></form>${user ? `<button class="icon-link account-logout" data-store-logout aria-label="Đăng xuất">♙ <span class="hide-mobile">${user.name} · Đăng xuất</span></button>` : '<a class="icon-link" href="login.html" aria-label="Tài khoản">♙ <span class="hide-mobile">Tài khoản</span></a>'}<a class="icon-link" href="cart.html" aria-label="Giỏ hàng">♧ <span class="cart-count">${count()}</span></a></div></div></div>`;
    const adminLink = document.createElement('a');
    adminLink.href = 'admin/login.html';
    adminLink.textContent = 'Quản trị';
    $('.nav-links', target).append(adminLink);
    $('.mobile-menu', target).addEventListener('click', event => {
      const nav = $('.nav-links', target);
      const open = nav.classList.toggle('open');
      event.currentTarget.setAttribute('aria-expanded', String(open));
    });
  }

  function footer() {
    const target = $('[data-site-footer]');
    if (!target) return;
    target.innerHTML = `<footer class="site-footer"><div class="wrap"><div class="footer-grid"><div><a class="brand" href="index.html">mobi<span>+</span></a><p style="margin-top:14px;max-width:260px">Thiết bị tốt, trải nghiệm dễ dàng. Chọn công nghệ phù hợp với bạn.</p></div><div><h3>Mua sắm</h3><a href="products.html">Tất cả sản phẩm</a><br><a href="products.html?category=Điện%20thoại">Điện thoại</a><br><a href="products.html?category=Phụ%20kiện">Phụ kiện</a></div><div><h3>Hỗ trợ</h3><a href="cart.html">Giỏ hàng</a><br><a href="checkout.html">Thanh toán</a><br><a href="admin/dashboard.html">Quản trị demo</a></div><div><h3>Liên hệ</h3><p>Hotline: 1800 6868<br>09:00–21:00 mỗi ngày<br>hello@mobiplus.vn</p></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} mobi+. Đồ án website bán hàng điện tử.</span><span>Thanh toán an toàn · Bảo hành chính hãng</span></div></div></footer>`;
  }

  function card(product) {
    return `<article class="product-card"><a href="product-detail.html?id=${encodeURIComponent(product.id)}" class="product-image"><span class="badge">${product.badge || 'Chính hãng'}</span><img src="${product.image || fallbackImage}" alt="${product.name}" loading="lazy"></a><div class="product-info"><div class="product-meta">${product.brand} · ${product.category}</div><a href="product-detail.html?id=${encodeURIComponent(product.id)}"><h3 class="product-name">${product.name}</h3></a><div class="rating">★ ${product.rating || '4.8'} <span>(Đánh giá)</span></div><div class="price-row"><div><span class="price">${money(product.price)}</span>${product.oldPrice ? `<span class="old-price">${money(product.oldPrice)}</span>` : ''}</div><button class="add-button" data-add="${product.id}" aria-label="Thêm ${product.name} vào giỏ">+</button></div></div></article>`;
  }

  function renderCards(target, list) {
    if (target) target.innerHTML = list.length
      ? list.map(card).join('')
      : '<div class="empty-state" style="grid-column:1/-1">Không tìm thấy sản phẩm phù hợp.</div>';
  }

  function renderHome() {
    const list = products();
    renderCards($('#featured-products'), list.slice(0, 4));
    renderCards($('#new-products'), list.slice(4, 8));
    const host = $('#home-categories');
    if (!host) return;
    const icons = ['▣', '▤', '▱', '◷', '⌁'];
    host.innerHTML = categories().map((category, index) =>
      `<a class="category-tile" href="products.html?category=${encodeURIComponent(category)}"><span class="category-icon">${icons[index % icons.length]}</span><b>${category}</b><span>${list.filter(product => product.category === category).length} sản phẩm</span></a>`
    ).join('');
    let categoryProducts = $('#home-category-products');
    if (!categoryProducts) {
      const section = document.createElement('section');
      section.className = 'section';
      section.innerHTML = '<div class="wrap"><div class="section-head"><div><div class="eyebrow">Khám phá bộ sưu tập</div><h2>Sản phẩm theo danh mục</h2></div></div><div id="home-category-products"></div></div>';
      $('#categories')?.after(section);
      categoryProducts = $('#home-category-products');
    }
    if (categoryProducts) {
      categoryProducts.innerHTML = categories().map(category => {
        const matching = list.filter(product => product.category === category);
        return matching.length
          ? `<section class="home-category-section"><div class="section-head"><h3>${category}</h3><a class="text-link" href="products.html?category=${encodeURIComponent(category)}">Xem tất cả ↗</a></div><div class="product-grid">${matching.slice(0, 4).map(card).join('')}</div></section>`
          : '';
      }).join('');
    }
  }

  function renderCatalog() {
    const grid = $('#catalog-products');
    if (!grid) return;
    const params = new URLSearchParams(location.search);
    const search = $('#catalog-search');
    const category = $('#category-select');
    const sort = $('#sort-select');
    const pageSize = 4;
    let currentPage = 1;
    if (search && params.get('q')) search.value = params.get('q');
    if (category && params.get('category')) category.value = params.get('category');
    if (category) {
      const selected = category.value;
      category.innerHTML = '<option value="">Tất cả danh mục</option>' +
        categories().map(value => `<option value="${value}">${value}</option>`).join('');
      category.value = selected;
      if (params.get('category')) category.value = params.get('category');
    }
    const pagination = $('#catalog-pagination');
    const apply = (resetPage = true) => {
      if (resetPage) currentPage = 1;
      let list = products();
      const query = (search?.value || '').trim().toLocaleLowerCase('vi');
      if (query) list = list.filter(product => `${product.name} ${product.brand} ${product.category}`.toLocaleLowerCase('vi').includes(query));
      if (category?.value) list = list.filter(product => product.category === category.value);
      if (sort?.value === 'price-low') list.sort((a, b) => a.price - b.price);
      if (sort?.value === 'price-high') list.sort((a, b) => b.price - a.price);
      if (sort?.value === 'popular') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      const pageCount = Math.ceil(list.length / pageSize);
      currentPage = Math.min(currentPage, Math.max(1, pageCount));
      renderCards(grid, list.slice((currentPage - 1) * pageSize, currentPage * pageSize));
      const count = $('#catalog-count');
      if (count) count.textContent = `${list.length} sản phẩm`;
      if (pagination) {
        pagination.innerHTML = pageCount > 1
          ? `<button class="btn btn-light btn-small" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>← Trước</button>${Array.from({ length: pageCount }, (_, index) => `<button class="pagination-number ${index + 1 === currentPage ? 'active' : ''}" data-page="${index + 1}" aria-current="${index + 1 === currentPage ? 'page' : 'false'}">${index + 1}</button>`).join('')}<button class="btn btn-light btn-small" data-page="${currentPage + 1}" ${currentPage === pageCount ? 'disabled' : ''}>Tiếp →</button>`
          : '';
      }
    };
    search?.addEventListener('input', () => apply());
    category?.addEventListener('change', () => apply());
    sort?.addEventListener('change', () => apply());
    pagination?.addEventListener('click', event => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      currentPage = Number(button.dataset.page);
      apply(false);
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    apply();
  }

  function renderDetail() {
    const target = $('#product-detail');
    if (!target) return;
    const product = products().find(item => item.id === new URLSearchParams(location.search).get('id'));
    if (!product) {
      target.innerHTML = '<div class="empty-state">Sản phẩm không tồn tại hoặc đã bị xóa. <a class="text-link" href="products.html">Quay lại danh sách</a></div>';
      return;
    }
    target.innerHTML = `<div class="detail-visual"><img src="${product.image || fallbackImage}" alt="${product.name}"></div><div class="detail-copy"><div class="eyebrow">${product.brand} · ${product.category}</div><h1>${product.name}</h1><div class="rating">★ ${product.rating || 4.8} <span>· Hàng chính hãng</span></div><div class="price">${money(product.price)} ${product.oldPrice ? `<span class="old-price">${money(product.oldPrice)}</span>` : ''}</div><p>${product.description || 'Thiết bị chính hãng, bảo hành uy tín và giao hàng nhanh toàn quốc.'}</p><ul class="specs">${Object.entries(product.specs || {}).map(([key, value]) => `<li><span>${key}</span><br><strong>${value}</strong></li>`).join('')}</ul><div class="detail-actions"><input class="quantity" id="detail-quantity" type="number" min="1" max="${Math.max(1, product.stock)}" value="1" aria-label="Số lượng"><button class="btn btn-dark" data-add="${product.id}" data-quantity-input="#detail-quantity" ${product.stock < 1 ? 'disabled' : ''}>${product.stock < 1 ? 'Hết hàng' : 'Thêm vào giỏ'}</button><a class="btn btn-light" href="cart.html">Xem giỏ</a></div><p style="font-size:12px;margin-top:17px">✓ Miễn phí giao hàng · ✓ Bảo hành chính hãng · ✓ Đổi trả 30 ngày</p></div>`;
  }

  function showFormMessage(message) {
    const target = $('#form-message');
    if (target) target.textContent = message;
  }

  function authForms() {
    const login = $('#login-form');
    login?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(login);
      const email = String(form.get('email')).trim().toLowerCase();
      let user;
      try {
        const users = await database.usersByEmail(email);
        user = users.find(item => item.password === form.get('password'));
        if (!user) {
          const legacyUser = read('store_users', []).find(item =>
            item.email.toLowerCase() === email && item.password === form.get('password')
          );
          if (legacyUser) user = await databaseRequest('/users', { method: 'POST', body: JSON.stringify(legacyUser) });
        }
      } catch (error) {
        console.error('Could not read or migrate the account in db.json.', error);
        showFormMessage('Không kết nối được database. Hãy chạy npm start trong thư mục website rồi thử lại.');
        return;
      }
      if (!user) {
        showFormMessage('Thông tin đăng nhập chưa đúng. Vui lòng kiểm tra lại.');
        return;
      }
      try {
        await database.syncCart(email);
      } catch (error) {
        console.error('Could not sync the customer cart to db.json.', error);
        showFormMessage('Đăng nhập được nhưng chưa lưu được giỏ hàng. Kiểm tra JSON Server rồi thử lại.');
        return;
      }
      const account = JSON.stringify({ name: user.name, email: user.email });
      localStorage.removeItem('store_user');
      sessionStorage.removeItem('store_user');
      if (form.get('remember')) {
        localStorage.setItem('store_user', account);
      } else {
        sessionStorage.setItem('store_user', account);
      }
      location.href = 'index.html';
    });

    const register = $('#register-form');
    register?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(register);
      const email = String(form.get('email')).trim().toLowerCase();
      const users = read('store_users', []);
      if (form.get('password') !== form.get('confirm')) {
        showFormMessage('Mật khẩu xác nhận chưa khớp.');
        return;
      }
      const user = { name: String(form.get('name')).trim(), email, password: form.get('password') };
      try {
        const existingUsers = await database.usersByEmail(email);
        if (existingUsers.length || users.some(item => item.email.toLowerCase() === email)) {
          showFormMessage('Email này đã được đăng ký.');
          return;
        }
        await databaseRequest('/users', { method: 'POST', body: JSON.stringify(user) });
        await database.syncCart(email);
      } catch (error) {
        console.error('Could not save the account and initial cart to db.json.', error);
        showFormMessage('Không lưu được tài khoản hoặc giỏ hàng vào database. Kiểm tra JSON Server rồi thử lại.');
        return;
      }
      users.push(user);
      localStorage.setItem('store_users', JSON.stringify(users));
      localStorage.removeItem('store_user');
      sessionStorage.removeItem('store_user');
      localStorage.setItem('store_user', JSON.stringify({ name: user.name, email: user.email }));
      location.href = 'index.html';
    });

    const forgot = $('#forgot-form');
    forgot?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(forgot);
      const email = String(form.get('email')).trim().toLowerCase();
      const users = read('store_users', []);
      let user;
      try {
        user = (await database.usersByEmail(email))[0];
      } catch (error) {
        console.error('Could not read account from db.json.', error);
        showFormMessage('Không kết nối được database. Hãy chạy npm start trong thư mục website rồi thử lại.');
        return;
      }
      if (!user) {
        showFormMessage('Không tìm thấy tài khoản với email này.');
        return;
      }
      if (form.get('password') !== form.get('confirm')) {
        showFormMessage('Mật khẩu xác nhận chưa khớp.');
        return;
      }
      user.password = form.get('password');
      try {
        await databaseRequest(`/users/${encodeURIComponent(user.id)}`, { method: 'PATCH', body: JSON.stringify({ password: user.password }) });
      } catch (error) {
        console.error('Could not update password in db.json.', error);
        showFormMessage('Không lưu được mật khẩu mới vào database. Vui lòng thử lại.');
        return;
      }
      const localUser = users.find(item => item.email.toLowerCase() === email);
      if (localUser) localUser.password = user.password;
      localStorage.setItem('store_users', JSON.stringify(users));
      showFormMessage('Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.');
      forgot.reset();
    });
    const year = $('#current-year');
    if (year) year.textContent = new Date().getFullYear();
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('[data-store-logout]')) return;
    localStorage.removeItem('store_user');
    sessionStorage.removeItem('store_user');
    location.href = 'index.html';
  });
  if ($('main')?.querySelector('.hero')) $('main').classList.add('home-landscape');
  header();
  footer();
  renderHome();
  renderCatalog();
  renderDetail();
  authForms();
})();
