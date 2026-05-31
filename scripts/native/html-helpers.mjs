export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function paragraph(text) {
  return `<p>${escapeHtml(text)}</p>`;
}

export function bulletList(items) {
  return `<ul>\n${items
    .map((item) => `  <li>${escapeHtml(item)}</li>`)
    .join("\n")}\n</ul>`;
}

export function numberList(items) {
  return `<ol>\n${items
    .map((item) => `  <li>${escapeHtml(item)}</li>`)
    .join("\n")}\n</ol>`;
}

export function infoBox(title, body) {
  return [
    `<div class="am-cluster-box am-cluster-info">`,
    `  <h4>${escapeHtml(title)}</h4>`,
    `  <p>${escapeHtml(body)}</p>`,
    `</div>`,
  ].join("\n");
}

export function cardGrid(cards) {
  return [
    `<div class="am-cluster-card-grid">`,
    ...cards.map(
      (card) =>
        [
          `  <div class="am-cluster-card">`,
          `    <h4>${escapeHtml(card.title)}</h4>`,
          `    <p>${escapeHtml(card.body)}</p>`,
          `  </div>`,
        ].join("\n")
    ),
    `</div>`,
  ].join("\n");
}

export function simpleTable(headers, rows) {
  return [
    `<table class="am-cluster-inline-table">`,
    `  <thead><tr>${headers
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join("")}</tr></thead>`,
    `  <tbody>`,
    ...rows.map(
      (row) =>
        `    <tr>${row
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join("")}</tr>`
    ),
    `  </tbody>`,
    `</table>`,
  ].join("\n");
}

export function infSchuleFile({ title, menu, features, html, uuid }) {
  const parts = [`title: ${title}`, "----", `menu: ${menu}`];
  if (features) {
    parts.push("----", `features: ${features}`);
  }
  parts.push("----", html.trim(), "----", `uuid: ${uuid}`);
  return `${parts.join("\n")}\n`;
}
