"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useShop } from "./shop-shell";
import { ColorPicker, DesignControls } from "./shirt-customizer";
import ShirtPreview from "./shirt-preview";
import { products, formatMoney } from "../lib/store";
import Icon from "./ui-icon";

const ShirtScene = dynamic(() => import("./shirt-scene"), { ssr: false });

export default function CustomStudio({ embedded = false }) {
  const { design, designSide: view, setDesignSide: setView, getColor, setProductColor, physics, setPhysics, openProduct, resetDesign, ready } = useShop();
  const [selectedId, setSelectedId] = useState(products[0].id);
  const [viewResetKey, setViewResetKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const selected = products.find((product) => product.id === selectedId);
  const color = getColor(selected);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return <section id="customize" className={`custom-studio ${embedded ? "embedded-studio" : "section-wrap"}`} aria-labelledby="custom-studio-title">
    <div className="custom-studio-heading"><div><span className="eyebrow">ATELIER LAB / MADE BY YOU</span><h2 id="custom-studio-title">Your words.<br/><em>Your signature.</em></h2></div><p>A color for every mood. A mark that’s only yours.<br/>Design the front and back. See both on every piece.</p></div>
    <div className="custom-studio-grid">
      <div className="custom-preview-panel">
        <div className="custom-preview-top"><span><i className="status-dot"/> LIVE 3D PREVIEW</span><button type="button" onClick={resetDesign}>Reset design <Icon name="rotate" size={13}/></button></div>
        <div className="custom-scene-wrap"><span className="custom-scene-word" aria-hidden="true">YOURS.</span><div className="custom-scene"><ShirtScene color={color.hex} design={design} physics={physics} autoRotate={false} view={view} viewResetKey={viewResetKey} reducedMotion={reducedMotion}/></div><div className="custom-scene-caption"><Icon name="rotate" size={15}/> Drag to turn. Let the fabric move.</div></div>
        <div className="custom-preview-bottom"><div><span className="eyebrow">YOUR CANVAS</span><label className="sr-only" htmlFor="studio-piece">Choose a T-shirt</label><select id="studio-piece" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></div><div className="segmented-control compact-segments">{["front", "back"].map((side) => <button key={side} type="button" aria-label={`Studio ${side} view`} aria-pressed={view === side} onClick={() => { setView(side); setViewResetKey((key) => key + 1); }}>{side}</button>)}</div></div>
        <div className="custom-fabric"><div className="option-label">Fabric color <b>{color.name}</b></div><ColorPicker product={selected} color={color} onChange={(choice) => setProductColor(selected.id, choice)} labelPrefix="Studio fabric"/></div>
        <div className="physics-controls"><div className="physics-heading"><div><span className="eyebrow">A LITTLE PLAY, A LOT OF FEEL</span><h3>Made to move.</h3></div><button type="button" className={`motion-toggle ${physics.enabled ? "on" : ""}`} aria-label="Fabric physics" aria-pressed={physics.enabled} onClick={() => setPhysics((current) => ({ ...current, enabled: !current.enabled }))}><span/></button></div><div className="physics-actions"><label>Wind <input type="range" aria-label="Wind strength" min="0" max="100" value={physics.wind} disabled={!physics.enabled || reducedMotion} onChange={(event) => setPhysics((current) => ({ ...current, wind: Number(event.target.value) }))}/><span>{physics.wind}%</span></label><button type="button" disabled={!physics.enabled || reducedMotion} onClick={() => setPhysics((current) => ({ ...current, impulse: current.impulse + 1 }))}>Give it a shake <Icon name="rotate" size={14}/></button></div><p>{reducedMotion ? "Motion is still to match your reduced-motion preference." : "Soft fabric ripples. A charm that swings with every turn."}</p></div>
      </div>
      <div className="custom-controls-panel"><div className="mobile-design-preview"><ShirtPreview color={color.hex} design={design} back={view === "back"} label="Your live design"/><div><span className="eyebrow">YOUR LIVE DESIGN</span><strong>{selected.name}</strong><small>{color.name} · {view}</small></div></div><div className="custom-controls-title"><span className="eyebrow">01 — MAKE YOUR MARK</span><span className="live-badge">LIVE</span></div><DesignControls/><button type="button" disabled={!ready} className="button button-light full-width custom-buy" onClick={() => openProduct(selected)}>Choose size & add to bag <Icon name="arrow" size={18}/></button><p className="design-note">{formatMoney(selected.price)} · Custom details confirmed with your order.</p></div>
    </div>
    <div className="studio-lineup-heading"><span className="eyebrow">ONE SIGNATURE. SIX WAYS TO WEAR IT.</span><span>Pick a piece to change its color.</span></div>
    <div className="studio-lineup" role="group" aria-label="Your design across the collection">{products.map((product, index) => <button type="button" key={product.id} aria-label={`Customize ${product.name}`} aria-pressed={product.id === selectedId} onClick={() => setSelectedId(product.id)}><span className="lineup-number">0{index + 1}</span><ShirtPreview color={getColor(product).hex} design={design} back={view === "back"} label={product.name}/><strong>{product.name}</strong><small><i style={{ background: getColor(product).hex }}/>{getColor(product).name}</small></button>)}</div>
  </section>;
}
