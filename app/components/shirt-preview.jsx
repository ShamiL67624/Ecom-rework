"use client";
import { useId } from "react";
import { artworkUrl, printOnSide } from "../lib/artwork";

export default function ShirtPreview({ color = "#ddd8cd", graphic = false, back = false, design = null, className = "", label = "ATELIER IX T-shirt" }) {
  const id = useId().replace(/:/g, "");
  const light = ["#e", "#d", "#f", "#c"].some((v) => color.toLowerCase().startsWith(v));
  const print = light ? "#262621" : "#e9e5db";
  const side = back ? "back" : "front";
  const sidePrint = design?.[side];
  return <svg className={`shirt-preview ${className}`} viewBox="0 0 400 440" role="img" aria-label={`${label}${sidePrint ? ` · ${side} · ${sidePrint.enabled ? sidePrint.text || sidePrint.logo : "No print"}` : ""}`} data-print={sidePrint?.enabled ? sidePrint.text : ""} data-color={color} data-side={side}>
    <defs>
      <linearGradient id={`${id}-cloth`} x1="0" x2="1" y1=".1" y2=".4"><stop offset="0" stopColor="#fff" stopOpacity=".04"/><stop offset=".18" stopColor="#fff" stopOpacity=".14"/><stop offset=".44" stopColor="#000" stopOpacity=".03"/><stop offset=".72" stopColor="#fff" stopOpacity=".12"/><stop offset="1" stopColor="#000" stopOpacity=".28"/></linearGradient>
      <linearGradient id={`${id}-fold`}><stop stopColor="#000" stopOpacity="0"/><stop offset=".5" stopColor="#000" stopOpacity=".3"/><stop offset=".8" stopColor="#fff" stopOpacity=".05"/><stop offset="1" stopColor="#000" stopOpacity="0"/></linearGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#000" stopOpacity=".24"/><stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
      <filter id={`${id}-texture`}><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComposite in="SourceGraphic" operator="in"/></filter>
      <path id={`${id}-shape`} d="M145 53 99 69Q89 73 80 87L32 157Q51 178 91 193L118 151Q120 214 116 267L111 385Q195 403 289 385L284 267Q280 214 282 151L309 193Q349 178 368 157L320 87Q311 73 301 69L255 53Q247 83 200 84Q153 83 145 53Z"/>
      <clipPath id={`${id}-clip`}><use href={`#${id}-shape`}/></clipPath>
    </defs>
    <ellipse cx="200" cy="403" rx="142" ry="19" fill={`url(#${id}-shadow)`}/>
    <use href={`#${id}-shape`} fill={color}/><use href={`#${id}-shape`} fill={`url(#${id}-cloth)`}/>
    <g clipPath={`url(#${id}-clip)`}>
      <path d="m123 126 13 118-6 144h-22l8-180ZM273 126l-8 112 9 150h22l-9-180Z" fill={`url(#${id}-fold)`}/>
      <path d="m145 84 20 90-30-60ZM255 84l-20 90 30-60ZM124 278l30 102-32-50ZM278 258l-27 120 35-40Z" fill="#000" opacity=".055"/>
      <path d="M159 381q9-63 17-97M223 385q-7-42-3-68" fill="none" stroke="#fff" strokeOpacity=".06" strokeWidth="4"/>
      <rect x="30" y="50" width="340" height="350" filter={`url(#${id}-texture)`} opacity=".038"/>
      <path d="M37 154q22 24 58 31M306 186q36-8 56-33M112 376q85 17 177 0" fill="none" stroke="#000" strokeOpacity=".16" strokeWidth="2"/>
      <path d="M99 72q19 24 20 79M301 72q-19 24-19 79" fill="none" stroke="#fff" strokeOpacity=".13" strokeWidth="1.6"/>
      {design ? (printOnSide(design, back) && <image href={artworkUrl(sidePrint, color)} x="135" y="122" width="130" height="130"/>) : graphic ? <g fill={print} textAnchor="middle"><text x="200" y="193" fontSize="32" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="-2">ATELIER</text><text x="200" y="222" fontSize="31" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="12">IX</text><text x="200" y="249" fontSize="5" letterSpacing="2">AN EXERCISE IN EVERYDAY FORM</text><path d="M159 266h82" stroke={print} strokeWidth=".7"/></g> : <g fill={print} textAnchor="middle"><text x={back ? "200" : "242"} y={back ? "119" : "155"} fontSize={back ? "11" : "8"} fontWeight="600" fontFamily="Arial, sans-serif" letterSpacing="2">ATELIER IX</text><text x={back ? "200" : "242"} y={back ? "130" : "164"} fontSize="3.5" fontFamily="Arial, sans-serif" letterSpacing="1.6">EVERYDAY / REDEFINED</text></g>}
    </g>
    {design && design.charm !== "none" && !back && <g className="shirt-accessory" transform="translate(277 316)" aria-hidden="true"><path d="M0 0q8 10 2 21" stroke="#b9b7ae" strokeWidth="2" fill="none"/>{design.charm === "orb" ? <g fill="none" stroke="#d4d9c2" strokeWidth="2"><circle cx="2" cy="30" r="10"/><ellipse cx="2" cy="30" rx="15" ry="4" transform="rotate(-30 2 30)"/></g> : <g><rect x="-6" y="20" width="17" height="31" rx="2" fill="#c5cba9" stroke="#8a9476"/><circle cx="2" cy="24" r="2" fill="#484c3e"/><text x="2" y="40" textAnchor="middle" fontFamily="Arial" fontSize="7" fill="#25291e">IX</text></g>}</g>}
    <path d="M145 53q8 31 55 31t55-31" fill="none" stroke="#000" strokeOpacity=".28" strokeWidth="10"/>
    <path d="M147 53q8 25 53 25t53-25" fill="none" stroke={color} strokeWidth="8"/>
    <path d="M149 55q9 24 51 24t51-24" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="1"/>
    <path d="M188 76h24v10h-24z" fill="#161714"/><text x="200" y="82.5" fontSize="3.5" textAnchor="middle" fill="#e1ddd3" letterSpacing="1">IX / M</text>
  </svg>;
}
