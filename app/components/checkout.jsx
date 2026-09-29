"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Icon from "./ui-icon";
import { useShop, CartLine } from "./shop-shell";
import { calculateTotals, formatMoney, validateCheckout, buildWhatsAppOrderUrl, designUploads } from "../lib/store";

const initialCustomer = { fullName: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", note: "" };

export default function Checkout() {
  const { cart, ready, setCartOpen } = useShop();
  const [customer, setCustomer] = useState(initialCustomer);
  const [errors, setErrors] = useState({});
  const [order, setOrder] = useState(null);
  const form = useRef(null);
  const totals = calculateTotals(cart);

  function submit(event) {
    event.preventDefault();
    const issues = validateCheckout(customer);
    setErrors(issues);
    if (Object.keys(issues).length) { form.current?.elements.namedItem(Object.keys(issues)[0])?.focus(); return; }
    if (!cart.length) return;
    const orderId = `AX-${Date.now().toString(36).toUpperCase()}`;
    const url = buildWhatsAppOrderUrl({ items: cart, customer, totals, orderId });
    const attachments = [...new Map(cart.filter((item) => item.design).flatMap((item) => designUploads(item.design)).map((logo) => [`${logo.side}:${logo.image}`, logo])).values()];
    setOrder({ url, orderId, total: totals.total, attachments });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function field(name, label, options = {}) {
    const { wide, as = "input", ...attributes } = options;
    const Tag = as;
    return <label className={`form-field ${wide ? "wide" : ""}`} key={name}><span>{label}</span><Tag name={name} value={customer[name]} onChange={(event) => { setCustomer((value) => ({ ...value, [name]: event.target.value })); if (errors[name]) setErrors((value) => ({ ...value, [name]: "" })); }} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} {...attributes}/>{errors[name] && <small id={`${name}-error`} className="field-error" role="alert">{errors[name]}</small>}</label>;
  }

  if (!ready) return <main id="main" className="section-wrap empty-page"><p>Getting your bag ready…</p></main>;
  if (!cart.length && !order) return <main id="main" className="section-wrap empty-page checkout-empty"><Icon name="bag" size={48}/><h1>Your bag is waiting.</h1><p>Add your everyday favorites before checking out.</p><Link className="button button-light" href="/shop">Explore the collection <Icon name="arrow" size={18}/></Link></main>;
  if (order) return <main id="main" className="section-wrap checkout-success"><span className="success-icon"><Icon name="whatsapp" size={32}/></span><span className="eyebrow">ONE LAST STEP</span><h1>Your everyday.<br/>Ready to send.</h1><p>We opened WhatsApp with your full order and delivery details.<br/><b>Tap Send in WhatsApp</b> to share your order with our team.</p><div className="order-reference"><span>ORDER REFERENCE <b>{order.orderId}</b></span><span>ORDER TOTAL <b>{formatMoney(order.total)}</b></span></div><a href={order.url} target="_blank" rel="noopener noreferrer" className="button button-light" data-testid="whatsapp-order-link">Open WhatsApp again <Icon name="diagonal" size={18}/></a>{order.attachments.length > 0 && <div className="order-attachments"><h2>Send your artwork too.</h2><p>Download your logo below and attach it to the WhatsApp conversation.</p>{order.attachments.map((logo, index) => <a key={index} href={logo.image} download={`atelier-logo-${index + 1}.webp`}><img src={logo.image} alt=""/><span><b>{logo.side === "front" ? "Front logo" : "Back logo"}</b><br/>{logo.name}</span><Icon name="diagonal" size={16}/></a>)}</div>}<p className="fine-print">Your order is a request until our team confirms it.<br/>No payment has been collected. Your bag is saved while you finish.</p><div className="success-actions"><button className="text-link" onClick={() => setOrder(null)}>Edit delivery details</button><Link href="/shop" className="text-link">Continue exploring <Icon name="arrow" size={16}/></Link></div></main>;

  return <main id="main" className="section-wrap checkout-page"><Link href="/shop" className="back-link"><Icon name="arrow" size={15}/> Back to the collection</Link><div className="section-heading"><div><span className="eyebrow">A FEW DETAILS. THEN IT’S YOURS.</span><h1>Make it yours.</h1></div><span className="checkout-location">INDIA / INR ₹</span></div><div className="checkout-grid"><form ref={form} onSubmit={submit} noValidate className="checkout-form"><div className="form-section-title"><span>01</span><h2>Your details</h2></div><div className="form-fields">{field("fullName", "Full name", { autoComplete: "name", placeholder: "Your full name", required: true, maxLength: 100 })}{field("phone", "Phone number", { autoComplete: "tel-national", inputMode: "tel", type: "tel", placeholder: "10-digit mobile number", required: true, maxLength: 18 })}{field("email", "Email (optional)", { wide: true, type: "email", autoComplete: "email", placeholder: "you@example.com", maxLength: 150 })}</div><div className="form-section-title"><span>02</span><h2>Where should it go?</h2></div><div className="form-fields">{field("address", "Address", { wide: true, as: "textarea", rows: 2, autoComplete: "street-address", placeholder: "House / flat, street, area, landmark", required: true, maxLength: 400 })}{field("city", "City", { autoComplete: "address-level2", placeholder: "Your city", required: true, maxLength: 100 })}{field("state", "State", { autoComplete: "address-level1", placeholder: "Your state", required: true, maxLength: 100 })}{field("pincode", "PIN code", { inputMode: "numeric", autoComplete: "postal-code", placeholder: "6-digit PIN code", required: true, maxLength: 6 })}<label className="form-field"><span>Country</span><input value="India" readOnly aria-label="Country"/></label>{field("note", "Order note (optional)", { wide: true, as: "textarea", rows: 2, placeholder: "Anything we should know?", maxLength: 500 })}</div><div className="whatsapp-notice"><Icon name="whatsapp" size={25}/><div><h3>Finish with a conversation.</h3><p>Your order and delivery details will open in WhatsApp to <b>+91 99618 21977</b>. Tap Send, and we’ll confirm your pieces and payment details there.</p></div></div><button type="submit" className="button button-light checkout-submit">Continue on WhatsApp <Icon name="arrow" size={18}/></button><p className="checkout-consent">Continuing opens a message containing the details above. You choose when to send it. No online payment is taken.</p></form><aside className="checkout-summary"><div className="summary-heading"><h2>Your everyday edit</h2><button className="text-link" onClick={() => setCartOpen(true)}>Edit bag</button></div><div className="checkout-items">{cart.map((item) => <CartLine key={item.key} item={item} compact/>)}</div><div className="order-totals"><div><span>Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div><div><span>Shipping</span><span>{totals.shipping ? formatMoney(totals.shipping) : "Complimentary"}</span></div><div className="total-line"><span>Total</span><b>{formatMoney(totals.total)}</b></div></div><div className="summary-assurance"><Icon name="shield" size={18}/><span>Review your order before sending.<br/>Your details stay in your browser until you continue.</span></div></aside></div></main>;
}
