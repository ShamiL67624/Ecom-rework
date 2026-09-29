"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useShop } from "./shop-shell";
import { colorChoices } from "../lib/store";
import { prepareLogo } from "../lib/artwork";
import Icon from "./ui-icon";

export function ColorPicker({ product, color, onChange, labelPrefix = product.name, compact = false }) {
  const { ready } = useShop();
  return <div className={`fabric-colors ${compact ? "compact-colors" : ""}`} role="group" aria-label={`${product.name} fabric color`}>
    {colorChoices(product).map((choice) => <button type="button" disabled={!ready} key={choice.name} className={`color-option ${color.name === choice.name ? "selected" : ""}`} style={{ "--swatch": choice.hex }} aria-label={`${labelPrefix} ${choice.name}`} title={choice.name} aria-pressed={color.name === choice.name} onClick={() => onChange(choice)}/>)}
    <label className={`custom-color ${color.name.startsWith("Custom") ? "selected" : ""}`} title="Choose any color"><span>+</span><input type="color" disabled={!ready} value={color.hex} aria-label={`Custom color for ${product.name}`} onChange={(event) => onChange({ name: `Custom ${event.target.value}`, hex: event.target.value })}/></label>
  </div>;
}

export function DesignControls({ compact = false }) {
  const { design: fullDesign, designSide: side, setDesignSide, updateSideDesign, updateDesign: updateGarment, ready } = useShop();
  const design = fullDesign[side];
  const updateDesign = (patch) => updateSideDesign(side, patch);
  const [uploads, setUploads] = useState({ front: false, back: false });
  const [errors, setErrors] = useState({ front: "", back: "" });
  const uploading = uploads[side];
  const error = errors[side];
  const setUploading = (value) => setUploads((current) => ({ ...current, [side]: value }));
  const setError = (value) => setErrors((current) => ({ ...current, [side]: value }));
  const request = useRef({ front: 0, back: 0 });
  const id = useId();
  useEffect(() => () => { request.current.front += 1; request.current.back += 1; }, []);
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const token = ++request.current[side];
    setUploading(true); setError("");
    try {
      const logo = await prepareLogo(file);
      if (token === request.current[side]) updateSideDesign(side, { ...logo, logo: "upload" });
    } catch (issue) { if (token === request.current[side]) setError(issue.message); }
    finally { if (token === request.current[side]) setUploading(false); }
  }
  return <fieldset disabled={!ready} className={`design-controls ${compact ? "compact-controls" : ""}`} aria-label="Shared T-shirt design">
    <p className="design-sync"><Icon name="check" size={13}/> Two sides, your signature. Applied to every T-shirt.</p>
    <div className="design-side-tabs" role="group" aria-label="Edit T-shirt side">{["front", "back"].map((value, index) => <button type="button" key={value} aria-label={`${value === "front" ? "Front" : "Back"} design`} aria-pressed={side === value} onClick={() => setDesignSide(value)}><span>0{index + 1}</span><strong>{value === "front" ? "Front design" : "Back design"}</strong><small>{fullDesign[value].enabled ? "Print on" : "Blank"}</small></button>)}</div>
    <div className="side-editing-note"><span>Editing the <b>{side}</b></span><label><input type="checkbox" checked={design.enabled} onChange={(event) => updateDesign({ enabled: event.target.checked })} aria-label={`Enable ${side} print`}/> Print on this side</label></div>
    {!design.enabled && <p className="side-blank-note">Add text or a logo to start this side’s design.</p>}
    <div className="design-field"><label htmlFor={`${id}-text`}>Your words <span>{Array.from(design.text).length}/32</span></label><input id={`${id}-text`} value={design.text} maxLength={64} placeholder="Say something. Make it yours." onChange={(event) => updateDesign({ text: event.target.value })}/></div>
    <div className="design-field"><label htmlFor={`${id}-font`}>Typography</label><select id={`${id}-font`} value={design.font} onChange={(event) => updateDesign({ font: event.target.value })}><option value="sans">Modern sans</option><option value="serif">Classic serif</option><option value="mono">Studio mono</option></select></div>
    <fieldset className="design-field"><legend>Choose your mark</legend><div className="logo-options">
      {[['monogram', 'IX', 'Monogram'], ['orbit', '◎', 'Orbit'], ['bolt', 'ϟ', 'Bolt'], ['none', '—', 'No logo']].map(([value, symbol, name]) => <button type="button" key={value} aria-pressed={design.logo === value} onClick={() => { request.current[side] += 1; setUploading(false); setError(""); updateDesign({ logo: value }); }}><b>{symbol}</b><span>{name}</span></button>)}
    </div></fieldset>
    {design.logo === "monogram" && <div className="design-field"><label htmlFor={`${id}-monogram`}>Monogram <span>4 characters</span></label><input id={`${id}-monogram`} value={design.monogram} maxLength={8} onChange={(event) => updateDesign({ monogram: event.target.value })}/></div>}
    <label className={`logo-upload ${design.logo === "upload" ? "has-logo" : ""}`}><Icon name="plus" size={17}/><span>{uploading ? "Preparing your logo…" : design.logo === "upload" ? design.imageName : "Upload your own logo"}<small>PNG, JPG or WebP · up to 5 MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={uploading} aria-label="Upload your own logo"/></label>
    {design.logo === "upload" && <div className="uploaded-logo"><img src={design.image} alt="Your uploaded logo"/><span>Original colors preserved</span><button type="button" className="text-link" onClick={() => updateDesign({ logo: "none", image: "", imageName: "" })}>Remove logo</button></div>}
    {error && <p className="upload-error" role="alert">{error}</p>}
    <div className="print-options"><div className="design-field"><span className="field-title">Print color</span><div className="ink-picker"><button type="button" aria-pressed={design.ink === "auto"} onClick={() => updateDesign({ ink: "auto" })}>Auto</button><label><input type="color" aria-label="Custom print color" value={design.ink === "auto" ? "#c5cba9" : design.ink} onChange={(event) => updateDesign({ ink: event.target.value })}/><span>{design.ink === "auto" ? "Custom" : design.ink}</span></label></div></div><div className="design-field"><label htmlFor={`${id}-scale`}>Print size <span>{design.scale}%</span></label><input id={`${id}-scale`} type="range" min="70" max="120" step="5" value={design.scale} onChange={(event) => updateDesign({ scale: Number(event.target.value) })}/></div></div>
    <fieldset className="design-field"><legend>Finishing touch</legend><div className="segmented-control">{[["none", "No accessory"], ["tag", "Studio tag"], ["orb", "Orbit charm"]].map(([value, title]) => <button type="button" key={value} aria-pressed={fullDesign.charm === value} onClick={() => updateGarment({ charm: value })}>{title}</button>)}</div></fieldset>
    {compact && <p className="design-note">Updates every preview. Pieces already in your bag keep their saved design.</p>}
  </fieldset>;
}
