"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Icon from "./ui-icon";
import ShirtPreview from "./shirt-preview";
import { useShop } from "./shop-shell";
import { products, formatMoney } from "../lib/store";
import CustomStudio from "./custom-studio";
import { ColorPicker } from "./shirt-customizer";

const ShirtScene = dynamic(() => import("./shirt-scene"), { ssr: false, loading: () => <div className="hero-shirt-loading"><ShirtPreview color="#dedbce"/></div> });

export default function Storefront() {
  return <main id="main"><Hero/><div className="values-strip"><span><Icon name="leaf" size={18}/> Considered cotton</span><i/><span><Icon name="ruler" size={18}/> A fit for every day</span><i/><span><Icon name="box" size={18}/> Made with intention</span><i/><span><Icon name="truck" size={18}/> Delivered across India</span></div><CustomStudio/><Collection/><Approach/><FAQ/><section className="closing-cta"><span className="eyebrow">FIND YOUR EVERYDAY UNIFORM</span><h2>Good things.<br/><em>On repeat.</em></h2><Link className="button button-dark" href="/shop">Make it yours <Icon name="diagonal" size={18}/></Link><span className="closing-stamp">ATELIER IX<br/>EVERYDAY, REDEFINED.</span></section></main>;
}

function Hero() {
  const { openProduct, design, designSide: view, setDesignSide: setView, getColor, setProductColor, physics } = useShop();
  const featured = products[0];
  const color = getColor(featured);
  const setColor = (choice) => setProductColor(featured.id, choice);
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewResetKey, setViewResetKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => { setReducedMotion(media.matches); if (media.matches) setAutoRotate(false); }; update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  return <section className="hero" aria-label="The everyday collection"><div className="hero-copy"><div className="eyebrow hero-eyebrow"><span className="status-dot"/> THE EVERYDAY COLLECTION — VOL. 01</div><h1>Good form.<br/><span>Great feel.</span></h1><p>Less to think about. More to live in.<br/>Considered T-shirts for whatever your day becomes.</p><div className="hero-actions"><Link className="button button-light" href="/shop">Find your everyday <Icon name="diagonal" size={19}/></Link><a className="understated-link" href="#customize">Customize your T-shirt <Icon name="arrow" size={16}/></a></div><div className="hero-details"><div><strong>240</strong><span>GSM COTTON</span></div><div><strong>01—06</strong><span>CONSIDERED STYLES</span></div><div><span className="detail-symbol">↗</span><span>MADE TO BE WORN</span></div></div></div><div className="hero-studio"><div className="studio-top"><span>01 / THE ORIGINAL</span><span className="studio-live"><i/> INTERACTIVE STUDIO</span></div><div className="studio-outline" aria-hidden="true">IX</div><div className="hero-scene" data-testid="hero-scene"><ShirtScene color={color.hex} design={design} physics={physics} view={view} viewResetKey={viewResetKey} autoRotate={autoRotate} reducedMotion={reducedMotion}/></div><div className="studio-note"><span>THE PERFECT<br/>EVERYDAY WEIGHT.</span><i/></div><div className="studio-floor" aria-hidden="true"/><div className="drag-hint"><Icon name="rotate" size={14}/> Drag to explore <span>360°</span><button aria-label={autoRotate ? "Pause shirt animation" : "Play shirt animation"} aria-pressed={autoRotate} onClick={() => setAutoRotate(!autoRotate)}><Icon name={autoRotate ? "pause" : "play"} size={12}/></button></div><div className="studio-controls"><div className="studio-product"><button onClick={() => openProduct({ ...featured, initialColor: color })}>Essential Heavyweight <Icon name="diagonal" size={14}/></button><span>{color.name} <i>·</i> {formatMoney(featured.price)}</span></div><div className="studio-colors" role="group" aria-label="Preview T-shirt color">{featured.colors.map((c) => <button key={c.name} aria-label={`Preview ${c.name}`} aria-pressed={color.name === c.name} className={`color-option ${color.name === c.name ? "selected" : ""}`} style={{ "--swatch": c.hex }} onClick={() => setColor(c)}/>)}</div><div className="view-switch">{["front", "back"].map((side) => <button key={side} className={view === side ? "active" : ""} onClick={() => { setView(side); setViewResetKey((n) => n + 1); setAutoRotate(false); }} aria-pressed={view === side}>{side}</button>)}</div></div></div><div className="hero-bottom"><span>QUIETLY DIFFERENT. COMPLETELY YOU.</span><a href="#collection">SCROLL TO DISCOVER <span>↓</span></a></div></section>;
}

export function ProductCard({ product, index = 0 }) {
  const { openProduct, wishlist, toggleWishlist, design, designSide, getColor, setProductColor, ready } = useShop();
  const color = getColor(product);
  const setColor = (choice) => setProductColor(product.id, choice);
  const saved = wishlist.includes(product.id);
  return <article className="product-card" data-testid={`product-${product.id}`} style={{ "--card-delay": `${index * 65}ms` }}><div className="product-art"><span className="product-badge">{product.badge}</span><button disabled={!ready} className={`product-save icon-btn ${saved ? "saved" : ""}`} onClick={() => toggleWishlist(product.id)} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`} aria-pressed={saved}><Icon name="heart" size={18}/></button><button disabled={!ready} className="product-art-link" aria-label={`View ${product.name}`} onClick={() => openProduct({ ...product, initialColor: color })}><ShirtPreview color={color.hex} graphic={product.category === "Graphic"} design={design} back={designSide === "back"} label={`${product.name} in ${color.name}`}/></button><span className="product-fit">{product.category === "Oversized" ? "OVERSIZED FIT" : "EVERYDAY FIT"}</span><button disabled={!ready} className="quick-shop" aria-label={`Quick shop ${product.name}`} onClick={() => openProduct({ ...product, initialColor: color })}><Icon name="plus" size={19}/><span>Choose your fit</span></button></div><div className="product-meta"><div><button disabled={!ready} className="product-name" onClick={() => openProduct({ ...product, initialColor: color })}>{product.name}</button><span className="product-category">{color.name} / {product.category}</span></div><span className="product-price">{formatMoney(product.price)}</span></div><div className="card-swatches"><ColorPicker product={product} color={color} onChange={setColor} labelPrefix={`${product.name} in`} compact/></div></article>;
}

export function Collection({ full = false }) {
  const [filter, setFilter] = useState("All pieces");
  const [sort, setSort] = useState("featured");
  const list = useMemo(() => { let items = (full ? products : products.slice(0, 4)).filter((p) => filter === "All pieces" || p.category === filter); if (sort !== "featured") items = [...items].sort((a, b) => sort === "low" ? a.price - b.price : b.price - a.price); return items; }, [full, filter, sort]);
  const Tag = full ? "main" : "section";
  return <Tag id={full ? "main" : "collection"} className={`collection-section section-wrap ${full ? "full-collection" : ""}`}>{full && <CustomStudio embedded/>}<div className="section-heading"><div><span className="eyebrow">{full ? "THE COLLECTION / VOL. 01" : "THE EVERYDAY EDIT"}</span><h2>{full ? <>Find your<br/><em>everyday.</em></> : <>Nothing extra.<br/>Just essentials.</>}</h2></div><div className="section-heading-aside"><p>Good cotton. Better cuts.<br/>The pieces you keep coming back to.</p>{!full && <Link className="text-link" href="/shop">Explore all pieces <Icon name="diagonal" size={16}/></Link>}</div></div><div className="collection-tools"><div className="collection-tabs" role="group" aria-label="Filter collection">{["All pieces", "Essentials", "Oversized", "Graphic"].map((category) => <button key={category} className={filter === category ? "active" : ""} onClick={() => setFilter(category)} aria-pressed={filter === category}>{category}{category === "All pieces" && <span>{full ? "06" : "04"}</span>}</button>)}</div><label className="sort-select"><span>{full ? "SORT BY" : "CURATED FOR YOU"}</span>{full && <select aria-label="Sort products" value={sort} onChange={(e) => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select>}</label></div><div className={`product-grid ${full ? "shop-grid" : ""}`}>{list.map((p, index) => <ProductCard product={p} index={index} key={p.id}/>)}</div>{!full && <div className="collection-footnote"><span>Fewer pieces. More possibilities.</span><Link href="/shop">Meet the full collection <Icon name="arrow" size={16}/></Link></div>}</Tag>;
}

export function Wishlist() {
  const { wishlist, ready } = useShop();
  const items = products.filter((p) => wishlist.includes(p.id));
  return <main id="main" className="section-wrap wishlist-page"><div className="section-heading"><div><span className="eyebrow">KEEP THE GOOD ONES CLOSE</span><h1>Your wishlist<span className="heading-count">{wishlist.length.toString().padStart(2, "0")}</span></h1></div><Link className="text-link" href="/shop">Back to the collection <Icon name="arrow" size={16}/></Link></div>{ready && items.length ? <div className="product-grid">{items.map((p) => <ProductCard product={p} key={p.id}/>)}</div> : <div className="empty-page"><Icon name="heart" size={46}/><h2>{ready ? "Room for your next favorite." : "Gathering your favorites…"}</h2><p>Tap the heart on a piece to save it here for later.</p><Link className="button button-light" href="/shop">Find your favorites <Icon name="arrow" size={17}/></Link></div>}</main>;
}

function Approach() {
  const { design } = useShop();
  return <section className="approach section-wrap" id="about"><div className="approach-art"><div className="approach-art-heading"><span>THE DETAILS MAKE THE DIFFERENCE.</span><span>FIG. 01</span></div><div className="approach-shirt"><ShirtPreview color="#a39685" design={design} back/></div><div className="garment-callout callout-one"><i/><span>A COLLAR THAT HOLDS ITS FORM</span></div><div className="garment-callout callout-two"><i/><span>ROOM TO MOVE</span></div><div className="approach-art-bottom"><span>240<small>GSM</small></span><p>SUBSTANTIAL FEEL.<br/>EFFORTLESS DRAPE.</p></div></div><div className="approach-copy"><span className="eyebrow">A LITTLE LESS. A LOT MORE.</span><h2>Wear more.<br/><em>Think less.</em></h2><p>We believe the things you wear most should be the things you love most. So we start with one simple piece, and consider every detail.</p><div className="approach-principles"><div><span>01</span><div><h3>Feel it in the fabric.</h3><p>Soft, substantial cotton that makes everyday feel a little better.</p></div></div><div><span>02</span><div><h3>Find your kind of fit.</h3><p>Clean lines. Relaxed proportions. Nothing getting in your way.</p></div></div><div><span>03</span><div><h3>Keep it in rotation.</h3><p>Quiet colors and considered shapes, made to go with your life.</p></div></div></div><Link className="text-link" href="/shop">Meet your new uniform <Icon name="diagonal" size={17}/></Link></div></section>;
}

function FAQ() {
  const questions = [
    ["How do I place an order?", "Choose your piece, color, and size, then add it to your bag. At checkout, enter your delivery details and continue on WhatsApp. Your order is filled in for you; tap Send to share it with our team. We’ll confirm availability and arrange payment with you there."],
    ["Where do you ship, and what does it cost?", "We accept delivery addresses across India. Shipping is ₹150, and complimentary on orders of ₹5,000 or more. Your shipping total is shown before checkout. Our team will confirm the delivery timeline in your order conversation."],
    ["How do I choose my size?", "Open any piece and select Size guide for garment chest measurements. Our core fit is relaxed and unisex. Choose your usual size for an easy silhouette, or size down for a closer fit. Ask us in your order note if you need help."],
    ["How should I care for my T-shirt?", "Wash cold with similar colors, turn your T-shirt inside out, and let it dry in the shade. Avoid ironing directly over prints. For an exchange or any order concern, reply in your WhatsApp order conversation so our team can help."],
  ];
  return <section className="faq-section section-wrap" id="faq"><div><span className="eyebrow">A FEW GOOD ANSWERS</span><h2>Simple things.<br/>Thought through.</h2><p>From your first fit to your next favorite.</p></div><div className="faq-list">{questions.map(([q, a], i) => <details key={q}><summary><span><small>0{i + 1}</small>{q}</span><Icon name="plus" size={18}/></summary><p>{a}</p></details>)}</div></section>;
}
