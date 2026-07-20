(() => {
  const data = window.DASHBOARD_DATA || { settings: {}, pages: [] };
  const app = document.getElementById("app");
  const colors = ["#245eea","#13b98a","#ff7a18","#6d5ce7","#ef4444","#0ea5e9","#84cc16","#f59e0b"];
  const iconMap = {
    "layout-dashboard":"📊","settings":"⚙️","wallet":"💳","coins":"🪙","briefcase-business":"💼",
    "pie-chart":"◔","map":"🗺️","users":"👥","house":"🏠","building":"🏗️","droplets":"💧","zap":"⚡",
    "flame":"🔥","route":"🛣️","trees":"🌳","receipt":"🧾","landmark":"🏛️","circle-percent":"٪",
    "badge-check":"✅","triangle-alert":"⚠️","chart-no-axes-combined":"📈","building-2":"🏢"
  };
  let currentPage = null;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }
  function num(v) {
    if (typeof v !== "number") return esc(v);
    return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(v);
  }
  function icon(key) { return iconMap[key] || "◆"; }
  function fullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  function pageById(id) { return data.pages.find(p => p.page_id === id); }

  function shell(content, showBack = false) {
    return `
      <div class="app-wrap">
        <div class="shell">
          <header class="topbar">
            <div class="topbar-title">
              <div class="logo">◆</div>
              <div>
                <h1>${esc(data.settings.dashboard_title || "داشبورد مدیریتی پارس پرنون")}</h1>
                <div class="subtitle">${esc(data.settings.organization_name || "")} | ${esc(data.settings.updated_at || "")}</div>
              </div>
            </div>
            <div class="top-actions">
              ${showBack ? `<button class="soft-btn back-btn" data-action="back">← بازگشت به فهرست</button>` : ""}
              <button class="icon-btn" data-action="fullscreen">⛶ تمام‌صفحه</button>
            </div>
          </header>
          <main class="main">
            ${content}
          </main>
          <footer class="footer">${esc(data.settings.version || "")} — فایل داده: excel-data/dashboard-master.xlsx</footer>
        </div>
      </div>`;
  }

  function renderMenu() {
    const cards = [...data.pages].sort((a,b) => a.order-b.order).map(p => `
      <button class="menu-card" data-page="${esc(p.page_id)}">
        <div class="menu-icon">${icon(p.icon)}</div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.subtitle)}</p>
        <span class="card-arrow">←</span>
      </button>`).join("");
    const content = `
      <section class="hero">
        <div>
          <h2>فهرست:</h2>
        </div>
      </section>
      <section class="menu-grid">${cards}</section>`;
    app.innerHTML = shell(content);
    app.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => {
      currentPage = btn.dataset.page;
      render();
    }));
    wireCommon();
  }

  function renderKpi(k) {
    return `<article class="kpi">
      <div class="kpi-icon">${icon(k.icon)}</div>
      <div><span class="kpi-value">${num(k.value)}</span><span class="kpi-unit">${esc(k.unit)}</span></div>
      <div class="kpi-title">${esc(k.title)}</div>
    </article>`;
  }

  function barChart(chart) {
    const vals = chart.data.map(d => Number(d.value) || 0);
    const max = Math.max(...vals, 1);
    const W=760,H=250, padL=55,padB=42,padT=18,padR=15;
    const plotW=W-padL-padR, plotH=H-padB-padT, step=plotW/Math.max(chart.data.length,1);
    let svg = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}">`;
    for(let i=0;i<=4;i++){
      const y=padT+plotH-(plotH*i/4), label=Math.round(max*i/4);
      svg += `<line x1="${padL}" x2="${W-padR}" y1="${y}" y2="${y}" stroke="#dbe5ef" stroke-dasharray="4 5"/>
              <text x="${padL-9}" y="${y+4}" font-size="11" fill="#718096" text-anchor="end">${num(label)}</text>`;
    }
    chart.data.forEach((d,i)=>{
      const bw=Math.min(58, step*.58), x=padL+(step*i)+(step-bw)/2, h=(Number(d.value)||0)/max*plotH, y=padT+plotH-h;
      svg += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="5" fill="${colors[i%colors.length]}"/>
              <text x="${x+bw/2}" y="${Math.max(y-7,12)}" font-size="11" fill="#31506f" text-anchor="middle">${num(Number(d.value)||0)}</text>
              <text x="${x+bw/2}" y="${H-17}" font-size="11" fill="#64748b" text-anchor="middle">${esc(d.label)}</text>`;
    });
    return svg + `</svg>`;
  }

  function lineChart(chart) {
    const vals=chart.data.map(d=>Number(d.value)||0), max=Math.max(...vals,1), min=Math.min(...vals,0);
    const W=760,H=250,padL=55,padB=42,padT=18,padR=18,plotW=W-padL-padR,plotH=H-padB-padT;
    const span=Math.max(max-min,1);
    const points=chart.data.map((d,i)=>{
      const x=padL+(chart.data.length===1?plotW/2:(plotW*i/(chart.data.length-1)));
      const y=padT+plotH-((Number(d.value)-min)/span*plotH);
      return {x,y,d};
    });
    let svg=`<svg class="chart-svg" viewBox="0 0 ${W} ${H}">`;
    for(let i=0;i<=4;i++){
      const y=padT+plotH-(plotH*i/4), label=min+(span*i/4);
      svg+=`<line x1="${padL}" x2="${W-padR}" y1="${y}" y2="${y}" stroke="#dbe5ef" stroke-dasharray="4 5"/>
            <text x="${padL-9}" y="${y+4}" font-size="11" fill="#718096" text-anchor="end">${num(Math.round(label))}</text>`;
    }
    svg+=`<polyline points="${points.map(p=>`${p.x},${p.y}`).join(" ")}" fill="none" stroke="${colors[0]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    points.forEach((p,i)=>{
      svg+=`<circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff" stroke="${colors[0]}" stroke-width="3"/>
            <text x="${p.x}" y="${p.y-11}" font-size="11" fill="#31506f" text-anchor="middle">${num(Number(p.d.value)||0)}</text>
            <text x="${p.x}" y="${H-17}" font-size="11" fill="#64748b" text-anchor="middle">${esc(p.d.label)}</text>`;
    });
    return svg+`</svg>`;
  }

  function doughnutChart(chart) {
    const vals=chart.data.map(d=>Math.max(Number(d.value)||0,0)), total=vals.reduce((a,b)=>a+b,0)||1;
    const W=760,H=250,cx=255,cy=125,r=84,sw=34,circ=2*Math.PI*r;
    let offset=0,svg=`<svg class="chart-svg" viewBox="0 0 ${W} ${H}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#edf2f7" stroke-width="${sw}"/>`;
    vals.forEach((v,i)=>{
      const dash=circ*(v/total);
      svg+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="${sw}"
      stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += dash;
    });
    svg+=`<text x="${cx}" y="${cy-5}" font-size="16" font-weight="700" fill="#1f3b59" text-anchor="middle">${num(total)}</text>
          <text x="${cx}" y="${cy+18}" font-size="11" fill="#718096" text-anchor="middle">${esc(chart.y_title || "")}</text>`;
    chart.data.forEach((d,i)=>{
      const y=48+i*30;
      svg+=`<rect x="460" y="${y-10}" width="12" height="12" rx="3" fill="${colors[i%colors.length]}"/>
            <text x="482" y="${y}" font-size="12" fill="#475569">${esc(d.label)}: ${num(Number(d.value)||0)}</text>`;
    });
    return svg+`</svg>`;
  }

  function renderChart(c) {
    const svg = c.type === "line" || c.type === "area" ? lineChart(c) : c.type === "doughnut" ? doughnutChart(c) : barChart(c);
    return `<div class="chart-box"><div class="box-title">${esc(c.title)}</div>${svg}</div>`;
  }

  function renderTable(t) {
    const head=t.columns.map(c=>`<th>${esc(c)}</th>`).join("");
    const rows=t.rows.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("");
    return `<div class="table-box"><div class="box-title">${esc(t.title)}</div>
      <table class="data-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderTexts(items=[]) {
    return items.map(t=>`<div class="text-box"><strong>${esc(t.title)}</strong>${esc(t.body)}</div>`).join("");
  }

  function renderAttachments(items = []) {
  if (!items || items.length === 0) return "";
  
  return `
    <div class="attach-box">
      ${items.map(a => `
        <div class="attach-item" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #1e293b; display: block;">${esc(a.title)}</strong>
            ${a.description ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${esc(a.description)}</div>` : ""}
          </div>
          <a href="${esc(a.file_name)}" class="soft-btn" style="text-decoration:none; white-space: nowrap; margin-left: 10px;" download>
            📎 دریافت فایل
          </a>
        </div>
      `).join("")}
    </div>`;
}
  
  
  function renderMap(layers=[]) {
    if(!layers.length) return "";
    return `<div class="map-box"><div class="box-title">نقشه تعاملی</div>
      <div class="map-placeholder"><div><div style="font-size:44px">🗺️</div><strong>بخش نقشه</strong></div></div>
      <div class="layer-list">${layers.map(l=>`<span class="layer-chip">${l.visible ? "●" : "○"} ${esc(l.title)}</span>`).join("")}</div>
    </div>`;
  }

  function renderSection(s) {
    const hasGrid=(s.charts||[]).length>1;
    return `<article class="accordion ${s.default_open ? "open" : ""}" data-section="${esc(s.section_id)}">
      <button class="accordion-header" type="button">
        <span class="accordion-title">${esc(s.title)}<small>${esc(s.description)}</small></span>
        <span class="chev">◀</span>
      </button>
      <div class="accordion-body">
        ${renderTexts(s.texts)}
        ${(s.kpis||[]).length ? `<div class="kpi-grid">${s.kpis.map(renderKpi).join("")}</div>` : ""}
        ${(s.charts||[]).length ? `<div class="${hasGrid ? "content-grid" : ""}">${s.charts.map(renderChart).join("")}</div>` : ""}
        ${(s.tables||[]).map(renderTable).join("")}
        ${renderMap(s.map_layers)}
        ${renderAttachments(s.attachments)}
      </div>
    </article>`;
  }

  function renderReport(page) {
    const sections=[...page.sections].sort((a,b)=>a.order-b.order).map(renderSection).join("");
    const content=`
      <section class="report-head">
        <div>
          <h2>${icon(page.icon)} ${esc(page.title)}</h2>
          <p class="subtitle">${esc(page.subtitle)} | به‌روزرسانی: ${esc(data.settings.updated_at || "")}</p>
        </div>
        <div class="toolbar">
          <button class="primary-btn" data-action="print">🧾 خروجی گزارش</button>
          <button class="soft-btn" data-action="open-all">▾ باز کردن همه</button>
          <button class="soft-btn" data-action="close-all">▴ بستن همه</button>
        </div>
      </section>
      ${sections || `<div class="empty">محتوایی تعریف نشده است.</div>`}`;
    app.innerHTML=shell(content,true);
    app.querySelectorAll(".accordion-header").forEach(btn=>btn.addEventListener("click",()=>{
      btn.closest(".accordion").classList.toggle("open");
    }));
    app.querySelector('[data-action="print"]').addEventListener("click",()=>window.print());
    app.querySelector('[data-action="open-all"]').addEventListener("click",()=>app.querySelectorAll(".accordion").forEach(a=>a.classList.add("open")));
    app.querySelector('[data-action="close-all"]').addEventListener("click",()=>app.querySelectorAll(".accordion").forEach(a=>a.classList.remove("open")));
    wireCommon();
  }

  function wireCommon(){
    app.querySelectorAll('[data-action="fullscreen"]').forEach(b=>b.addEventListener("click",fullscreen));
    app.querySelectorAll('[data-action="back"]').forEach(b=>b.addEventListener("click",()=>{currentPage=null;render();}));
  }

  function render(){
    if(!app) return;
    if(currentPage) return renderReport(pageById(currentPage));
    renderMenu();
  }
  render();
})();
