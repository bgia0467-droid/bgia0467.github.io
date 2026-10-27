(() => {
  const $=selector=>document.querySelector(selector);
  const money=value=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(value||0);
  const read=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
  const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const fallbackImage=`data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#edf0f4"/><g fill="none" stroke="#3159d9" stroke-width="9" stroke-linecap="round"><rect x="159" y="54" width="82" height="192" rx="14"/><path d="M183 75h34M191 224h18"/></g><text x="200" y="278" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#68717e">mobi+</text></svg>')}`;
  const imagePath=src=>src?.startsWith('assets/')?`../${src}`:src||fallbackImage;
  document.addEventListener('error',event=>{const image=event.target;if(image instanceof HTMLImageElement&&image.src!==fallbackImage)image.src=fallbackImage},true);
  const getProducts=()=>{
    const orders=getOrders().filter(order=>order.status!=='Đã hủy');
    return read('store_products',window.STORE_PRODUCTS).map(product=>{
      const defaultImage=window.STORE_PRODUCTS.find(item=>item.id===product.id)?.image;
      const sold=orders.flatMap(order=>order.items||[]).filter(item=>item.id===product.id||(!item.id&&item.name===product.name)).reduce((sum,item)=>sum+Number(item.quantity||0),0);
      const stock=Number.isFinite(Number(product.stock))?Math.max(0,Number(product.stock)):Math.max(0,20-sold);
      const image=defaultImage&&(!product.image||product.image.includes('images.unsplash.com'))?defaultImage:product.image;
      return{...product,image,stock};
    });
  };
  const getOrders=()=>read('store_orders');
  const updateOrderStatus=async(orderId,status)=>{
    const response=await fetch(`http://localhost:3000/orders/${encodeURIComponent(orderId)}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({status})
    });
    if(!response.ok)throw new Error(`Database request failed (${response.status}).`);
    return response.json();
  };
  const syncOrdersFromDatabase=async()=>{
    const response=await fetch('http://localhost:3000/orders');
    if(!response.ok)throw new Error(`Database request failed (${response.status}).`);
    const databaseOrders=await response.json();
    if(!Array.isArray(databaseOrders))throw new Error('Database returned an invalid orders list.');
    const databaseIds=new Set(databaseOrders.map(order=>String(order.id)));
    const localOnlyOrders=getOrders().filter(order=>!databaseIds.has(String(order.id)));
    save('store_orders',[...databaseOrders,...localOnlyOrders]);
  };
  const categoryRecords=()=>read('store_categories',window.STORE_CATEGORIES).map((category,index)=>typeof category==='string'?{id:`category-${index+1}`,name:category}:{id:String(category.id),name:String(category.name)});
  const categories=()=>categoryRecords().map(category=>category.name);
  const page=document.body.dataset.adminPage;
  const adminEmail='admin@mobi.vn';
  const adminPassword='Admin@123';
  if(page==='login'){
    if(sessionStorage.getItem('store_admin_session')==='active'){location.replace('dashboard.html');return}
    $('#admin-login-form')?.addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.currentTarget);if(form.get('email')===adminEmail&&form.get('password')===adminPassword){sessionStorage.setItem('store_admin_session','active');location.replace('dashboard.html');return}$('#admin-login-error').textContent='Email hoặc mật khẩu chưa chính xác.'});
    return;
  }
  if(sessionStorage.getItem('store_admin_session')!=='active'){location.replace('login.html');return}
  const labels={dashboard:'Tổng quan',categories:'Danh mục',products:'Sản phẩm',customers:'Khách hàng',orders:'Đơn hàng'};
  const nav=$('[data-admin-nav]');
  if(nav){nav.innerHTML=`<div class="admin-side"><a class="brand" href="dashboard.html">mobi<span>+</span></a><div class="admin-label">Bảng điều khiển</div><nav class="admin-nav"><a class="${page==='dashboard'?'active':''}" href="dashboard.html">▦ &nbsp; Tổng quan</a><a class="${page==='categories'?'active':''}" href="categories.html">▤ &nbsp; Danh mục</a><a class="${page==='products'?'active':''}" href="products.html">▣ &nbsp; Sản phẩm</a><a class="${page==='customers'?'active':''}" href="customers.html">♙ &nbsp; Khách hàng</a><a class="${page==='orders'?'active':''}" href="orders.html">▧ &nbsp; Đơn hàng</a></nav><div class="admin-side-bottom">mobi+ · Quản trị cửa hàng<br><a href="../index.html" style="color:#c8f169">← Về trang bán hàng</a></div></div>`}
  const top=$('[data-admin-top]');if(top)top.innerHTML=`<strong>${labels[page]||'Quản trị'}</strong><div style="display:flex;align-items:center;gap:18px"><a href="../index.html" style="font-size:13px;color:#26725b;font-weight:700">Xem cửa hàng ↗</a><button class="btn btn-light btn-small" data-admin-logout>Đăng xuất</button></div>`;
  function dashboard(){
    const host=$('#admin-dashboard');if(!host)return;
    const orders=getOrders(),items=getProducts(),customers=read('store_customers');
    const activeOrders=orders.filter(order=>order.status!=='Đã hủy');
    const revenue=activeOrders.reduce((sum,order)=>sum+order.total,0);
    const soldById=new Map();
    activeOrders.forEach(order=>(order.items||[]).forEach(item=>{const key=item.id||item.name;soldById.set(key,(soldById.get(key)||0)+Number(item.quantity||0))}));
    const soldFor=product=>soldById.get(product.id)||soldById.get(product.name)||0;
    const unitsSold=Array.from(soldById.values()).reduce((sum,quantity)=>sum+quantity,0);
    const inventory=items.reduce((sum,product)=>sum+Number(product.stock||0),0);
    host.innerHTML=`<div class="stat-grid"><div class="stat-card"><span>Doanh thu ghi nhận</span><strong>${money(revenue)}</strong><small>${activeOrders.length} đơn chưa hủy</small></div><div class="stat-card"><span>Sản phẩm đã bán</span><strong>${unitsSold}</strong><small>${activeOrders.length} đơn hàng</small></div><div class="stat-card"><span>Sản phẩm tồn kho</span><strong>${inventory}</strong><small>${items.length} mã sản phẩm</small></div><div class="stat-card"><span>Khách hàng</span><strong>${customers.length}</strong><small>Khách đã mua hàng</small></div></div>${purchaseChart(items,soldFor)}<section class="admin-panel"><h2>Tồn kho và số lượng đã bán</h2>${inventoryTable(items,soldFor)}</section><section class="admin-panel"><h2>Đơn hàng gần đây</h2>${orderTable(orders.slice(0,5))}</section>`
  }
  function purchaseChart(items,soldFor){
    const maxSold=Math.max(1,...items.map(soldFor));
    return `<section class="admin-panel"><h2>Số lượng đặt mua theo sản phẩm</h2><div class="admin-chart" role="list" aria-label="Biểu đồ cột số lượng sản phẩm đã đặt mua">${items.map((product,index)=>{const sold=soldFor(product);const height=sold?Math.max(8,sold/maxSold*100):0;return `<div class="admin-chart-item" role="listitem" aria-label="${product.name}: ${sold} sản phẩm"><strong class="admin-chart-value">${sold}</strong><div class="admin-chart-track"><div class="admin-chart-bar ${index%2?'alt':''}" style="height:${height}%"></div></div><span class="admin-chart-label" title="${product.name}">${product.name}</span></div>`}).join('')}</div></section>`
  }
  function inventoryTable(list,soldFor){
    if(!list.length)return '<p style="color:#68716c">Chưa có sản phẩm.</p>';
    return `<div class="table-wrap"><table><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Đã bán</th><th>Tồn kho</th><th>Tình trạng</th></tr></thead><tbody>${list.map(product=>`<tr><td><div class="admin-product"><img src="${imagePath(product.image)}" alt=""><strong>${product.name}</strong></div></td><td>${product.category}</td><td>${soldFor(product)}</td><td><strong>${product.stock}</strong></td><td><span class="status ${product.stock<=5?'pending':''}">${product.stock<=5?'Sắp hết':'Còn hàng'}</span></td></tr>`).join('')}</tbody></table></div>`
  }
  function orderTable(orders){if(!orders.length)return '<p style="color:#68716c">Chưa có đơn hàng. Đơn mới sẽ xuất hiện ở đây.</p>';return `<div class="table-wrap"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>${orders.map(order=>`<tr><td><strong>${order.id}</strong></td><td>${order.customer?.name||'Khách mua hàng'}</td><td>${new Date(order.createdAt).toLocaleDateString('vi-VN')}</td><td>${money(order.total)}</td><td>${page==='orders'?`<select data-order-status="${order.id}">${['Chờ xác nhận','Đang xử lý','Đang giao','Hoàn thành','Đã hủy'].map(status=>`<option ${order.status===status?'selected':''}>${status}</option>`).join('')}</select>`:`<span class="status ${order.status==='Chờ xác nhận'?'pending':order.status==='Đã hủy'?'cancelled':''}">${order.status}</span>`}</td></tr>`).join('')}</tbody></table></div>`}
  function productTable(list,actions=true){if(!list.length)return '<p style="color:#68716c">Chưa có sản phẩm.</p>';return `<div class="table-wrap"><table><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th>Thương hiệu</th>${actions?'<th>Thao tác</th>':''}</tr></thead><tbody>${list.map(p=>`<tr><td><div class="admin-product"><img src="${imagePath(p.image)}" alt=""><strong>${p.name}</strong></div></td><td>${p.category}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${p.brand}</td>${actions?`<td><button class="btn btn-light btn-small" data-edit-product="${p.id}">Sửa</button> <button class="delete-btn" data-delete-product="${p.id}">Xóa</button></td>`:''}</tr>`).join('')}</tbody></table></div>`}
  function productsPage(){
    const host=$('#admin-products');if(!host)return;
    const all=getProducts();
    host.innerHTML=`<form class="admin-form" id="product-form"><input type="hidden" name="id"><input name="name" required minlength="2" placeholder="Tên sản phẩm"><select name="category" required>${categories().map(c=>`<option value="${c}">${c}</option>`).join('')}</select><input name="price" required type="number" min="1" placeholder="Giá bán (đ)"><input name="brand" required placeholder="Thương hiệu"><input name="stock" required type="number" min="0" value="20" placeholder="Tồn kho"><input name="image" type="url" placeholder="URL ảnh (không bắt buộc)"><button class="btn btn-dark btn-small" id="product-submit">+ Thêm sản phẩm</button><button class="btn btn-light btn-small" id="product-cancel" type="button" hidden>Hủy sửa</button></form>${productTable(all)}`;
    const formElement=$('#product-form');
    formElement.addEventListener('submit',event=>{
      event.preventDefault();
      if(!formElement.reportValidity())return;
      const values=Object.fromEntries(new FormData(formElement));
      const list=getProducts();
      const editing=list.find(item=>item.id===values.id);
      if(editing){
        Object.assign(editing,{name:values.name.trim(),category:values.category,price:Number(values.price),stock:Number(values.stock),brand:values.brand.trim(),image:values.image.trim()||editing.image||''});
      }else{
        list.unshift({id:`custom-${Date.now()}`,name:values.name.trim(),category:values.category,price:Number(values.price),stock:Number(values.stock),brand:values.brand.trim(),image:values.image.trim(),rating:5,badge:'Mới',description:'Sản phẩm mới từ cửa hàng mobi+.'});
      }
      save('store_products',list);
      alert(editing?'Cập nhật sản phẩm thành công.':'Thêm sản phẩm thành công.');
      productsPage();
    });
    $('#product-cancel').addEventListener('click',productsPage);
  }
  function categoriesPage(){
    const host=$('#admin-categories');if(!host)return;
    const records=categoryRecords();
    host.innerHTML=`<form class="admin-search" id="category-form"><input class="field" name="category" required minlength="2" placeholder="Tên danh mục mới"><button class="btn btn-dark btn-small">+ Thêm danh mục</button></form><div class="admin-panel"><div class="table-wrap"><table><thead><tr><th>Danh mục</th><th>Số sản phẩm</th><th>Thao tác</th></tr></thead><tbody>${records.map(category=>`<tr><td><strong>${category.name}</strong></td><td>${getProducts().filter(p=>p.category===category.name).length}</td><td><button class="btn btn-light btn-small" data-edit-category="${category.id}">Sửa</button> <button class="delete-btn" data-delete-category="${category.id}">Xóa</button></td></tr>`).join('')}</tbody></table></div></div>`;
    $('#category-form').addEventListener('submit',event=>{
      event.preventDefault();
      const name=String(new FormData(event.currentTarget).get('category')).trim();
      if(records.some(category=>category.name.toLocaleLowerCase('vi')===name.toLocaleLowerCase('vi'))){alert('Danh mục này đã tồn tại.');return}
      save('store_categories',[...records,{id:`category-${Date.now()}`,name}]);
      alert('Thêm danh mục thành công.');
      categoriesPage();
    });
  }
  function customersPage(){const host=$('#admin-customers');if(!host)return;const customers=read('store_customers');host.innerHTML=customers.length?`<div class="table-wrap"><table><thead><tr><th>Khách hàng</th><th>Email</th><th>Số điện thoại</th><th>Số đơn</th><th>Đã chi tiêu</th></tr></thead><tbody>${customers.map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.email}</td><td>${c.phone}</td><td>${c.orders||1}</td><td>${money(c.total)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state"><h2>Chưa có khách hàng</h2><p>Khách hàng sẽ xuất hiện sau khi có đơn hàng đầu tiên.</p></div>'}
  function ordersPage(){const host=$('#admin-orders');if(host)host.innerHTML=orderTable(getOrders())}
  document.addEventListener('click',event=>{
    const editProduct=event.target.closest('[data-edit-product]');
    if(editProduct){
      const product=getProducts().find(item=>item.id===editProduct.dataset.editProduct);
      const form=$('#product-form');
      if(!product||!form)return;
      for(const [key,value] of Object.entries({id:product.id,name:product.name,category:product.category,price:product.price,brand:product.brand,stock:product.stock,image:product.image||''})){
        if(form.elements.namedItem(key))form.elements.namedItem(key).value=value;
      }
      $('#product-submit').textContent='Lưu thay đổi';
      $('#product-cancel').hidden=false;
      form.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    const product=event.target.closest('[data-delete-product]');
    if(product){
      if(!confirm('Bạn có chắc muốn xóa sản phẩm này?'))return;
      save('store_products',getProducts().filter(item=>item.id!==product.dataset.deleteProduct));
      productsPage();
      return;
    }
    const editCategory=event.target.closest('[data-edit-category]');
    if(editCategory){
      const record=categoryRecords().find(item=>item.id===editCategory.dataset.editCategory);
      if(!record)return;
      const newName=prompt('Nhập tên danh mục mới:',record.name)?.trim();
      if(!newName||newName===record.name)return;
      if(categories().some(name=>name.toLocaleLowerCase('vi')===newName.toLocaleLowerCase('vi'))){alert('Danh mục này đã tồn tại.');return}
      save('store_categories',categoryRecords().map(item=>item.id===record.id?{...item,name:newName}:item));
      save('store_products',getProducts().map(item=>item.category===record.name?{...item,category:newName}:item));
      alert('Cập nhật danh mục thành công.');
      categoriesPage();
      return;
    }
    const category=event.target.closest('[data-delete-category]');
    if(category){
      const record=categoryRecords().find(item=>item.id===category.dataset.deleteCategory);
      if(!record)return;
      const name=record.name;
      if(getProducts().some(item=>item.category===name)){alert('Danh mục đang có sản phẩm, hãy chuyển hoặc xóa sản phẩm trước.');return}
      if(!confirm('Bạn có chắc muốn xóa danh mục này?'))return;
      save('store_categories',categoryRecords().filter(value=>value.id!==record.id));
      categoriesPage();
    }
  });
  document.addEventListener('change',async event=>{
    const select=event.target.closest('[data-order-status]');
    if(!select)return;
    const orders=getOrders();
    const order=orders.find(item=>item.id===select.dataset.orderStatus);
    if(!order)return;
    const previousStatus=order.status;
    const nextStatus=select.value;
    if(nextStatus===previousStatus)return;
    const inventory=getProducts();
    if(previousStatus==='Đã hủy'&&nextStatus!=='Đã hủy'){
      const unavailable=(order.items||[]).find(item=>{
        const product=inventory.find(entry=>entry.id===item.id);
        return !product||product.stock<Number(item.quantity||0);
      });
      if(unavailable){
        alert('Tồn kho hiện tại không đủ để khôi phục đơn hàng này.');
        select.value=previousStatus;
        return;
      }
    }
    try{
      await updateOrderStatus(order.id,nextStatus);
    }catch(error){
      console.error('Could not update order status in db.json.',error);
      alert('Không cập nhật được trạng thái đơn hàng trong db.json. Hãy kiểm tra JSON Server rồi thử lại.');
      select.value=previousStatus;
      return;
    }
    if(nextStatus==='Đã hủy'){
      (order.items||[]).forEach(item=>{
        const product=inventory.find(entry=>entry.id===item.id);
        if(product)product.stock+=Number(item.quantity||0);
      });
      save('store_products',inventory);
    }else if(previousStatus==='Đã hủy'){
      (order.items||[]).forEach(item=>{
        const product=inventory.find(entry=>entry.id===item.id);
        if(product)product.stock-=Number(item.quantity||0);
      });
      save('store_products',inventory);
    }
    order.status=nextStatus;
    save('store_orders',orders);
  });
  document.addEventListener('click',event=>{if(!event.target.closest('[data-admin-logout]'))return;sessionStorage.removeItem('store_admin_session');location.href='login.html'});
  const renderPages=()=>{dashboard();productsPage();categoriesPage();customersPage();ordersPage()};
  syncOrdersFromDatabase().then(renderPages).catch(error=>{
    console.error('Could not load current order statuses from db.json.',error);
    alert('Không tải được đơn hàng mới nhất từ db.json. Hãy kiểm tra JSON Server rồi tải lại trang.');
    renderPages();
  });
})();
