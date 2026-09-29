"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./ui-icon";
import ShirtPreview from "./shirt-preview";
import { products, formatMoney, makeCartKey, sanitizeCart, sanitizeWishlist, calculateTotals, CART_STORAGE_KEY, WISHLIST_STORAGE_KEY, STUDIO_STORAGE_KEY, DEFAULT_DESIGN, sanitizeDesign, sanitizeStudio, resolveColor, updateDesignSide, designUploads } from "../lib/store";
import { DesignControls, ColorPicker } from "./shirt-customizer";

const ShopContext = createContext(null);
export const useShop = () => useContext(ShopContext);

export function Modal({ open, onClose, children, className = "", label }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, [open]);
  return <dialog ref={ref} className={`modal ${className}`} aria-label={label} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>{open && children}</dialog>;
}

export default function ShopShell({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const [toast, setToast] = useState("");
  const [flight, setFlight] = useState(null);
  const [bagPulse, setBagPulse] = useState(0);
  const [studio, setStudio] = useState({ design: { ...DEFAULT_DESIGN }, colors: {} });
  const [designSide, setDesignSide] = useState("front");
  const [physics, setPhysics] = useState({ enabled: true, wind: 35, impulse: 0 });
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try { setCart(sanitizeCart(localStorage.getItem(CART_STORAGE_KEY))); setWishlist(sanitizeWishlist(localStorage.getItem(WISHLIST_STORAGE_KEY))); setStudio(sanitizeStudio(localStorage.getItem(STUDIO_STORAGE_KEY))); } catch { setStorageError("Browser storage is unavailable. Keep this tab open to keep your design and bag."); }
    setReady(true);
    const sync = (event) => { if (event.key === CART_STORAGE_KEY) setCart(sanitizeCart(event.newValue)); if (event.key === WISHLIST_STORAGE_KEY) setWishlist(sanitizeWishlist(event.newValue)); if (event.key === STUDIO_STORAGE_KEY) setStudio(sanitizeStudio(event.newValue)); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist)); localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(studio)); setStorageError(""); } catch { setStorageError("Your latest changes could not be saved in this browser. Keep this tab open to keep your design and bag."); } } }, [cart, wishlist, studio, ready]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!flight) return; const timer = setTimeout(() => setFlight(null), 900); return () => clearTimeout(timer); }, [flight]);

  const toggleWishlist = (id) => {
    setWishlist((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };
  const addToCart = (selectedProduct, color, size, origin) => {
    const design = sanitizeDesign(studio.design);
    const key = makeCartKey(selectedProduct.id, color.name, size, design);
    if (cart.find((item) => item.key === key)?.quantity >= 10) { setToast("You can add up to 10 of each design, size and color."); return false; }
    setCart((current) => sanitizeCart([...current, { productId: selectedProduct.id, color: color.name, size, quantity: 1, design }]));
    setToast(`${selectedProduct.name} · ${size} added to your bag`);
    setBagPulse((current) => current + 1);
    const destination = document.getElementById("nav-bag")?.getBoundingClientRect();
    if (origin && destination) setFlight({ id: Date.now(), design, color: color.hex, x: origin.left + origin.width / 2, y: origin.top, dx: destination.left + destination.width / 2 - origin.left - origin.width / 2, dy: destination.top - origin.top });
    return true;
  };
  const updateQuantity = (key, quantity) => setCart((current) => quantity < 1 ? current.filter((item) => item.key !== key) : current.map((item) => item.key === key ? { ...item, quantity: Math.min(10, quantity) } : item));
  const removeItem = (key) => setCart((current) => current.filter((item) => item.key !== key));
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const getColor = (item) => resolveColor(item, studio.colors[item.id]) || (item.id === products[0].id ? item.colors[1] : item.colors[0]);
  const setProductColor = (id, color) => setStudio((current) => ({ ...current, colors: { ...current.colors, [id]: color.name } }));
  const updateDesign = (patch) => setStudio((current) => ({ ...current, design: sanitizeDesign({ ...current.design, ...patch }) }));
  const updateSideDesign = (side, patch) => setStudio((current) => ({ ...current, design: updateDesignSide(current.design, side, patch) }));
  const resetDesign = () => { setStudio({ design: sanitizeDesign(DEFAULT_DESIGN), colors: {} }); setDesignSide("front"); };
  const value = { cart, wishlist, ready, cartOpen, setCartOpen, openProduct: setProduct, toggleWishlist, addToCart, updateQuantity, removeItem, count, setToast, design: studio.design, updateDesign, updateSideDesign, designSide, setDesignSide, resetDesign, getColor, setProductColor, physics, setPhysics, storageError };

  return <ShopContext.Provider value={value}>
    <a className="skip-link" href="#main">Skip to content</a>
    <Header bagPulse={bagPulse} />
    {children}
    <Footer />
    <CartDrawer />
    <ProductModal product={product} onClose={() => setProduct(null)} />
    <div className={`toast ${toast ? "visible" : ""}`} role="status"><span className="toast-check"><Icon name="check" size={15}/></span>{toast}<button onClick={() => { setToast(""); setCartOpen(true); }}>View bag <Icon name="arrow" size={14}/></button></div>
    {storageError && <p className="storage-notice" role="status">{storageError}</p>}
    {flight && <div key={flight.id} className="bag-flight" aria-hidden="true" style={{ left: flight.x, top: flight.y, "--flight-x": `${flight.dx}px`, "--flight-y": `${flight.dy}px` }}><ShirtPreview color={flight.color} design={flight.design}/></div>}
  </ShopContext.Provider>;
}

function Header({ bagPulse }) {
  const { count, wishlist, setCartOpen, openProduct, design, designSide, getColor } = useShop();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  useEffect(() => setMobileOpen(false), [pathname]);
  const matches = products.filter((item) => `${item.name} ${item.category} ${item.colors.map((color) => color.name).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="announcement"><span>GOOD THINGS. NO EXTRA NOISE.</span><span>Free shipping on orders ₹5,000+ <Icon name="arrow" size={12}/></span><span>DESIGNED IN INDIA. WORN EVERYWHERE.</span></div>
    <header className="site-header">
      <Link href="/" aria-label="Atelier IX home" className="wordmark">ATELIER<span>IX</span><sup>®</sup></Link>
      <nav aria-label="Main navigation" className="desktop-nav"><Link href="/" className={pathname === "/" ? "active" : ""}>Home</Link><Link href="/shop" className={pathname === "/shop" ? "active" : ""}>The collection <span className="nav-dot"/></Link><Link href="/#customize">Custom studio</Link><Link href="/#about">Our approach</Link></nav>
      <div className="header-actions"><button className="icon-btn search-trigger" aria-label="Search collection" onClick={() => setSearchOpen(true)}><Icon name="search"/></button><Link className="icon-btn wishlist-link" href="/wishlist" aria-label={`Wishlist, ${wishlist.length} items`}><Icon name="heart"/>{wishlist.length > 0 && <span className="tiny-count">{wishlist.length}</span>}</Link><button id="nav-bag" className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${count} items`}><Icon name="bag" size={18}/><span>Bag</span><b key={bagPulse} className={bagPulse ? "bag-bump" : ""}>{count.toString().padStart(2, "0")}</b></button><button className="icon-btn mobile-menu-button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-nav" onClick={() => setMobileOpen(!mobileOpen)}><Icon name={mobileOpen ? "close" : "menu"}/></button></div>
      {mobileOpen && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation"><Link href="/" onClick={() => setMobileOpen(false)}>Home</Link><Link href="/shop" onClick={() => setMobileOpen(false)}>The collection <Icon name="diagonal"/></Link><Link href="/#customize" onClick={() => setMobileOpen(false)}>Custom studio</Link><Link href="/wishlist" onClick={() => setMobileOpen(false)}>Wishlist ({wishlist.length})</Link><Link href="/#about" onClick={() => setMobileOpen(false)}>Our approach</Link><button onClick={() => { setMobileOpen(false); setSearchOpen(true); }}>Search collection <Icon name="search"/></button></nav>}
    </header>
    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} className="search-modal" label="Search collection"><div className="modal-heading"><h2>Find your everyday.</h2><button className="icon-btn" aria-label="Close search" onClick={() => setSearchOpen(false)}><Icon name="close"/></button></div><label className="search-input"><Icon name="search"/><input autoFocus type="search" placeholder="Search tees, colors, fits…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products"/></label><div className="search-results">{matches.map((item) => <button key={item.id} onClick={() => { setSearchOpen(false); openProduct({ ...item }); }}><span className="search-shirt"><ShirtPreview color={getColor(item).hex} design={design} back={designSide === "back"}/></span><span>{item.name}<small>{item.category}</small></span><b>{formatMoney(item.price)}</b><Icon name="arrow" size={16}/></button>)}{!matches.length && <p className="muted">No pieces found. Try “Chalk” or “Oversized”.</p>}</div></Modal>
  </>;
}

export function CartLine({ item, compact = false }) {
  const { updateQuantity, removeItem } = useShop();
  const [side, setSide] = useState(item.design?.front.enabled === false ? "back" : "front");
  const data = products.find((p) => p.id === item.productId);
  const color = data ? resolveColor(data, item.color)?.hex : undefined;
  return <article className={`cart-line ${compact ? "compact" : ""}`} data-testid="cart-line">
    <div className="cart-preview"><div className="cart-thumb"><ShirtPreview color={color} graphic={data?.category === "Graphic"} design={item.design} back={side === "back"}/></div>{item.design && <div className="cart-side-toggle" role="group" aria-label={`Preview ${item.name} sides`}>{["front", "back"].map((value) => <button type="button" key={value} aria-pressed={side === value} onClick={() => setSide(value)}>{value}</button>)}</div>}</div>
    <div className="cart-line-content"><h3>{item.name}</h3><p>{item.color} <span>/</span> {item.size}</p>
      {item.design && <div className="cart-design">{["front", "back"].map((value) => { const print = item.design[value]; return <div className="cart-side-summary" key={value}><b>{value === "front" ? "Front" : "Back"}</b><span>{print.enabled ? print.text || "No print text" : "No print"}</span>{print.enabled && <small>{print.logo === "upload" ? print.imageName : print.logo === "monogram" ? print.monogram : print.logo === "none" ? "No logo" : print.logo}</small>}</div>; })}<small>{item.design.charm === "none" ? "No accessory" : item.design.charm === "tag" ? "Studio tag" : "Orbit charm"}</small>{designUploads(item.design).map((logo) => <a key={logo.side} download={`atelier-${logo.side}-logo.webp`} href={logo.image}>Download {logo.side} logo for WhatsApp</a>)}</div>}
      <div className="cart-line-bottom">{compact ? <span className="muted">Qty {item.quantity}</span> : <div className="quantity-control"><button aria-label={`Decrease quantity of ${item.name}`} onClick={() => updateQuantity(item.key, item.quantity - 1)}><Icon name="minus" size={13}/></button><span aria-label="Quantity">{item.quantity}</span><button disabled={item.quantity === 10} aria-label={`Increase quantity of ${item.name}`} onClick={() => updateQuantity(item.key, item.quantity + 1)}><Icon name="plus" size={13}/></button></div>}<b>{formatMoney(item.price * item.quantity)}</b></div>
    </div>{!compact && <button className="remove-item icon-btn" aria-label={`Remove ${item.name} from bag`} onClick={() => removeItem(item.key)}><Icon name="close" size={15}/></button>}
  </article>;
}

function CartDrawer() {
  const { cart, cartOpen, setCartOpen, count } = useShop();
  const totals = calculateTotals(cart);
  return <Modal open={cartOpen} onClose={() => setCartOpen(false)} className="cart-drawer" label="Shopping bag"><div className="modal-heading"><h2>Your bag <span>({count})</span></h2><button className="icon-btn" aria-label="Close bag" onClick={() => setCartOpen(false)}><Icon name="close"/></button></div>{cart.length ? <><div className="shipping-progress"><p><Icon name="truck" size={17}/>{totals.shipping ? <span>You’re <b>{formatMoney(5000 - totals.subtotal)}</b> from free shipping.</span> : <span>Your order qualifies for <b>free shipping.</b></span>}</p><div><i style={{ width: `${Math.min(100, totals.subtotal / 5000 * 100)}%` }}/></div></div><div className="cart-lines">{cart.map((item) => <CartLine item={item} key={item.key}/>)}</div><div className="cart-summary"><div><span>Subtotal</span><b>{formatMoney(totals.subtotal)}</b></div><div><span>Shipping</span><span>{totals.shipping ? formatMoney(totals.shipping) : "Complimentary"}</span></div><div className="total-line"><span>Total</span><b data-testid="cart-total">{formatMoney(totals.total)}</b></div><Link className="button button-light full-width" href="/checkout" onClick={() => setCartOpen(false)}>Continue to checkout <Icon name="arrow" size={18}/></Link><p className="fine-print">Complete your order with us on WhatsApp.</p></div></> : <div className="empty-bag"><Icon name="bag" size={48}/><h3>A little room for something good.</h3><p>Your everyday favorites are waiting.</p><Link href="/shop" className="button button-light" onClick={() => setCartOpen(false)}>Explore the collection <Icon name="arrow" size={17}/></Link></div>}</Modal>;
}

function ProductModal({ product, onClose }) {
  const { wishlist, toggleWishlist, addToCart, design, designSide, getColor, setProductColor } = useShop();
  const [size, setSize] = useState("M");
  const [sizeGuide, setSizeGuide] = useState(false);
  const [added, setAdded] = useState(false);
  const buttonRef = useRef(null);
  useEffect(() => { if (product) { setSize("M"); setAdded(false); setSizeGuide(false); } }, [product]);
  useEffect(() => setAdded(false), [design]);
  useEffect(() => { if (added) { const timer = setTimeout(() => setAdded(false), 1600); return () => clearTimeout(timer); } }, [added]);
  const activeColor = product ? getColor(product) : null;
  return <Modal open={!!product} onClose={onClose} className="product-modal" label={product ? `Choose ${product.name}` : "Choose your T-shirt"}>{product && <><button className="modal-close icon-btn" aria-label="Close product" onClick={onClose}><Icon name="close"/></button><div className="product-modal-visual"><span className="eyebrow">{product.badge}</span><ShirtPreview color={activeColor.hex} graphic={product.category === "Graphic"} design={design} back={designSide === "back"} label={`${product.name} in ${activeColor.name}`}/><span className="visual-caption">CONSIDERED FORM. EVERYDAY FEEL.</span></div><div className="product-modal-info"><span className="eyebrow">THE EVERYDAY COLLECTION / 01</span><h2>{product.name}</h2><span className="detail-price">{formatMoney(product.price)}</span><p className="product-description">{product.description}</p><div className="option-label">Color <b>{activeColor.name}</b></div><ColorPicker product={product} color={activeColor} onChange={(c) => { setProductColor(product.id, c); setAdded(false); }} labelPrefix="Choose"/><div className="option-label">Size <button className="text-link" onClick={() => setSizeGuide(!sizeGuide)} aria-expanded={sizeGuide}><Icon name="ruler" size={14}/> Size guide</button></div><div className="size-options">{product.sizes.map((s) => <button key={s} className={s === size ? "selected" : ""} onClick={() => { setSize(s); setAdded(false); }} aria-pressed={s === size} aria-label={`Size ${s}`}>{s}</button>)}</div>{sizeGuide && <div className="size-guide"><p>Relaxed unisex fit. Choose your usual size; size down for a closer fit.</p><table><caption>Garment chest width, laid flat (cm)</caption><thead><tr>{product.sizes.map((s) => <th key={s}>{s}</th>)}</tr></thead><tbody><tr>{[50, 53, 56, 59, 62, 65].map((n) => <td key={n}>{n}</td>)}</tr></tbody></table></div>}<details className="modal-customizer"><summary>Personalize text & logo <Icon name="plus" size={14}/></summary><DesignControls compact/></details><div className="product-purchase"><button ref={buttonRef} className={`button button-light ${added ? "added" : ""}`} onClick={() => { setAdded(addToCart(product, activeColor, size, buttonRef.current?.getBoundingClientRect())); }}><Icon name={added ? "check" : "bag"} size={18}/>{added ? "Added to your bag" : "Add to bag"}<span>{formatMoney(product.price)}</span></button><button className={`save-product icon-btn ${wishlist.includes(product.id) ? "saved" : ""}`} onClick={() => toggleWishlist(product.id)} aria-label={wishlist.includes(product.id) ? "Remove from wishlist" : "Save to wishlist"} aria-pressed={wishlist.includes(product.id)}><Icon name="heart"/></button></div><div className="detail-notes"><span><Icon name="box" size={15}/> Carefully packed</span><span><Icon name="truck" size={15}/> Ships across India</span></div><details className="product-care"><summary>Fabric & care <Icon name="plus" size={14}/></summary><p>Soft cotton with a substantial hand feel. Wash cold with similar colors, dry in shade, and iron inside out. Give your everyday pieces a little care.</p></details></div></>}</Modal>;
}

function Footer() {
  return <footer className="site-footer"><div className="footer-top"><div><span className="eyebrow">LESS, BUT BETTER.</span><h2>Your everyday.<br/>Considered.</h2></div><div className="footer-links"><div><span>EXPLORE</span><Link href="/shop">The collection</Link><Link href="/wishlist">Your wishlist</Link><Link href="/#about">Our approach</Link></div><div><span>HERE TO HELP</span><Link href="/#faq">Shipping & orders</Link><Link href="/#faq">Sizing & care</Link><Link href="/checkout">Checkout</Link></div></div><Link href="/shop" className="footer-arrow" aria-label="Explore the collection"><Icon name="diagonal" size={35}/></Link></div><div className="footer-wordmark" aria-hidden="true">ATELIER IX<span>®</span></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ATELIER IX</span><span>DESIGNED WITH INTENTION. WORN YOUR WAY.</span><span>INDIA / INR ₹</span></div></footer>;
}
