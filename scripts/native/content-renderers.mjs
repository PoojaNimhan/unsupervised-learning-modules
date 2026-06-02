import {
  bulletList,
  cardGrid,
  escapeHtml,
  infoBox,
  numberList,
  paragraph,
  simpleTable,
} from "./html-helpers.mjs";

function renderModuleOverview(modules) {
  return [
    `<table class="am-cluster-inline-table">`,
    `<thead><tr><th>Modul</th><th>Schwerpunkt</th></tr></thead>`,
    `<tbody>`,
    ...modules.map(
      (module) =>
        `<tr><td>${escapeHtml(module.title)}</td><td>${escapeHtml(
          module.summary
        )}</td></tr>`
    ),
    `</tbody>`,
    `</table>`,
  ].join("\n");
}

export function renderStartPage(content) {
  return [
    `<p class="am-cluster-lead">${escapeHtml(content.intro)}</p>`,
    `<h3>${escapeHtml(content.learning_journey.heading)}</h3>`,
    bulletList(content.learning_journey.items),
    `<h3>${escapeHtml(content.usage.heading)}</h3>`,
    paragraph(content.usage.body),
    infoBox(content.advanced_hint.heading, content.advanced_hint.body),
    `<h3>${escapeHtml(content.module_overview.heading)}</h3>`,
    renderModuleOverview(content.module_overview.modules),
  ].join("\n\n");
}

function renderReveal(summary, body) {
  const contentHtml = renderRevealContent(body);
  return [
    `<details class="am-cluster-reveal">`,
    `  <summary>${escapeHtml(summary)}</summary>`,
    `  ${contentHtml}`,
    `</details>`,
  ].join("\n");
}

function renderRevealContent(body) {
  if (Array.isArray(body)) return bulletList(body);
  if (typeof body === "string") return paragraph(body);
  if (body && typeof body === "object") {
    return [
      body.intro ? paragraph(body.intro) : "",
      body.items ? bulletList(body.items) : "",
      body.featuresIntro ? paragraph(body.featuresIntro) : "",
      body.features ? bulletList(body.features) : "",
      body.distanceExplanation ? paragraph(body.distanceExplanation) : "",
      body.closing ? paragraph(body.closing) : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function nestedBulletList(items) {
  return [
    `<ul>`,
    ...items.map((item) =>
      [
        `  <li>${escapeHtml(item.title)}`,
        item.details ? bulletList(item.details) : "",
        `  </li>`,
      ]
        .filter(Boolean)
        .join("\n")
    ),
    `</ul>`,
  ].join("\n");
}

function renderConceptSections(sections) {
  return sections
    .flatMap((section) => [
      `<h4>${escapeHtml(section.title)}</h4>`,
      `<ul class="am-cluster-concept-outline">`,
      ...section.groups.map((group) =>
        [
          `  <li>`,
          `    <strong>${escapeHtml(group.label)}</strong>`,
          ...(group.paragraphs || []).map(
            (text) => `    <p>${escapeHtml(text)}</p>`
          ),
          group.items ? bulletList(group.items) : "",
          `  </li>`,
        ]
          .filter(Boolean)
          .join("\n")
      ),
      `</ul>`,
    ])
    .join("\n");
}

export function renderModule1Page(content) {
  const comparisonHeaders = [
    content.structuring.comparison_table_columns.food_name,
    content.structuring.comparison_table_columns.calories_kcal,
    content.structuring.comparison_table_columns.sugar_g,
    content.structuring.comparison_table_columns.fat_g,
  ];
  const appleDonutRows = [
    ["Apfel", "52", "10,4", "0,2"],
    ["Donut", "452", "22,0", "25,0"],
  ];
  const bananaRows = [["Banane", "89", "12,2", "0,3"]];
  const appleCakeRows = [["Apfelkuchen", "263", "16,5", "11,0"]];
  const snackHeaders = [
    "Snack-Abenteurer",
    "Zucker (g/100g)",
    "Fett (g/100g)",
    "Koordinaten",
  ];
  const snackRows = [
    ["🍎 Apfel", "10,4", "0,2", "(10,4 ; 0,2)"],
    ["🍌 Banane", "12,2", "0,3", "(12,2 ; 0,3)"],
    ["🍑 Pfirsich", "8,4", "0,3", "(8,4 ; 0,3)"],
    ["🍓 Erdbeere", "4,9", "0,3", "(4,9 ; 0,3)"],
    ["🥔 Kartoffelchips", "0,3", "35,0", "(0,3 ; 35,0)"],
    ["🥜 Erdnussflips", "2,5", "32,0", "(2,5 ; 32,0)"],
  ];
  return [
    `<p class="am-cluster-lead">${escapeHtml(content.intro)}</p>`,
    `<h3>${escapeHtml(content.exploration.heading)}</h3>`,
    `<h4>Deine Aufgabe</h4>`,
    paragraph(content.exploration.task_intro),
    paragraph(content.exploration.drag_instruction),
    `<cluster-food-sorter lang="de"></cluster-food-sorter>`,
    `<p class="am-cluster-note">${escapeHtml(
      content.exploration.current_grouping_note
    )}</p>`,
    `<h4>${escapeHtml(content.exploration.observation_heading)}</h4>`,
    bulletList(content.exploration.observation_questions),
    paragraph(content.exploration.everyday_labels_note),
    `<h3>${escapeHtml(content.structuring.heading)}</h3>`,
    paragraph(content.structuring.intro),
    renderReveal(
      "Antwort per Klick anzeigen",
      {
        items: content.structuring.computer_difference,
        featuresIntro: content.structuring.features_intro,
        features: content.structuring.features,
        distanceExplanation: content.structuring.distance_explanation,
      }
    ),
    `<h4>${escapeHtml(content.structuring.apple_vs_donut.heading)}</h4>`,
    paragraph(content.structuring.apple_vs_donut.intro),
    paragraph("Damit ergibt sich zum Beispiel folgende Darstellung:"),
    simpleTable(comparisonHeaders, appleDonutRows),
    paragraph(content.structuring.apple_vs_donut.explanation),
    `<h4>${escapeHtml(content.structuring.banana_similarity.heading)}</h4>`,
    paragraph(content.structuring.banana_similarity.prompt),
    simpleTable(comparisonHeaders, bananaRows),
    renderReveal(
      content.structuring.banana_similarity.reveal_label,
      content.structuring.banana_similarity.answer
    ),
    `<h4>${escapeHtml(content.structuring.apple_cake_similarity.heading)}</h4>`,
    paragraph(content.structuring.apple_cake_similarity.prompt),
    simpleTable(comparisonHeaders, appleCakeRows),
    renderReveal(
      content.structuring.apple_cake_similarity.reveal_label,
      content.structuring.apple_cake_similarity.answer
    ),
    `<h3>${escapeHtml(content.concept.heading)}</h3>`,
    paragraph(
      "Je nachdem, welche Eigenschaften man vergleicht, entstehen andere Gruppierungen."
    ),
    bulletList([
      "Wenn du den Zuckergehalt betrachtest, gehoeren Banane und Apfel zusammen.",
      "Wenn du den Fettgehalt betrachtest, gehoeren Donut und Apfelkuchen zusammen.",
      "Wenn du die Kalorien betrachtest, liegen Donut und Apfelkuchen in einer anderen Ecke des Raums.",
    ]),
    paragraph("Damit wird sichtbar:"),
    `<h4>${escapeHtml(content.concept.pattern_table_heading)}</h4>`,
    simpleTable(
      ["Merkmal im Fokus", "Sichtbares Muster"],
      content.concept.pattern_table_rows.map((row) => [
        row["Merkmal im Fokus"],
        row["Sichtbares Muster"],
      ])
    ),
    `<h4>${escapeHtml(content.concept.central_idea_heading)}</h4>`,
    Array.isArray(content.concept.central_idea_body)
      ? bulletList(content.concept.central_idea_body)
      : paragraph(content.concept.central_idea_body),
    paragraph(content.concept.unsupervised_learning_body),
    `<h4>${escapeHtml(content.concept.system_can_heading)}</h4>`,
    cardGrid(
      content.concept.system_can.map((item) => ({
        title: item.title,
        body: item.example,
      }))
    ),
    paragraph(content.concept.closing_note),
    `<h3>${escapeHtml(content.exercises.heading)}</h3>`,
    paragraph(content.exercises.intro),
    `<h4>${escapeHtml(content.exercises.mission_1.heading)}</h4>`,
    paragraph(content.exercises.mission_1.intro),
    bulletList(content.exercises.mission_1.axis_setup),
    simpleTable(snackHeaders, snackRows),
    numberList(content.exercises.mission_1.task_questions),
    `<h4>${escapeHtml(content.exercises.mission_2.heading)}</h4>`,
    paragraph(content.exercises.mission_2.prompt),
    cardGrid(
      content.exercises.mission_2.clans.map((clan) => ({
        title: clan.title,
        body: `${clan.snacks} ${clan.explanation}`,
      }))
    ),
    paragraph(content.exercises.mission_2.reflection_question),
    `<h4>${escapeHtml(content.exercises.mission_3.heading)}</h4>`,
    paragraph(content.exercises.mission_3.intro),
    nestedBulletList(content.exercises.mission_3.examples),
    paragraph(content.exercises.mission_3.clustering_note),
    `<h4>${escapeHtml(content.exercises.mission_4.heading)}</h4>`,
    paragraph(content.exercises.mission_4.intro),
    bulletList(content.exercises.mission_4.questions.map((question) => question.prompt)),
    `<cluster-snack-map lang="de"></cluster-snack-map>`,
  ].join("\n\n");
}

export function renderModule2Page(content) {
  const explorationHeaders = [
    "Auflistung",
    "Fläche (m²)",
    "Zimmer",
    "Zustand",
    "Preis (€)",
    "Beschreibung",
  ];
  const explorationRows = [
    ["1", "40", "1", "Gut", "180000", "Studio, moderne Küche"],
    ["2", "150", "5", "Gut", "620000", "Einfamilienhaus, Garten"],
    ["3", "35", "1", "Gut", "200000", "Studio in der Nähe der U-Bahn"],
    ["4", "160", "6", "Gut", "680000", "Einfamilienhaus mit Garage"],
    ["5", "400", "10", "Luxus", "3200000", "Villa mit Pool"],
    ["6", "45", "1", "Gut", "210000", "Studio mit Balkon"],
    ["7", "140", "5", "Gut", "590000", "Einfamilienhaus, ruhige Straße"],
    ["8", "450", "12", "Luxus", "3900000", "Herrenhaus mit Weinkeller"],
    ["9", "380", "2", "Einfach", "850000", "Ruine, renovierungsbedürftig"],
    ["10", "420", "11", "Luxus", "4200000", "Herrenhaus mit eigenem Park"],
  ];
  const structuringHeaders = [
    "Eigenschaft",
    "Wohnbereich",
    "Preis",
    "Beabsichtigtes Muster",
  ];
  const structuringRows = [
    ["City Studio 1", "1.0", "1.5", "Budget"],
    ["City Studio 2", "1.5", "2.0", "Budget"],
    ["City Studio 3", "2.0", "2.2", "Budget"],
    ["City Studio 4", "2.5", "2.8", "Budget"],
    ["Einfamilienhaus 1", "5.0", "5.2", "Familie"],
    ["Einfamilienhaus 2", "5.8", "5.9", "Familie"],
    ["Einfamilienhaus 3", "6.5", "6.4", "Familie"],
    ["Luxusvilla 1", "8.5", "8.8", "Luxus"],
    ["Luxusvilla 2", "9.2", "9.4", "Luxus"],
    ["Geisterhaus", "10.0", "0.5", "Ausreißer"],
  ];
  return [
    `<p class="am-cluster-lead">${escapeHtml(content.intro)}</p>`,
    `<h3>${escapeHtml(content.exploration.heading)}</h3>`,
    `<h4>${escapeHtml(content.exploration.feature_heading)}</h4>`,
    paragraph(content.exploration.intro),
    paragraph(content.exploration.dataset_intro),
    simpleTable(explorationHeaders, explorationRows),
    `<h4>${escapeHtml(content.exploration.interactive_heading)}</h4>`,
    paragraph(content.exploration.interactive_intro),
    bulletList([
      content.exploration.x_axis_options,
      content.exploration.y_axis_options,
    ]),
    paragraph(content.exploration.chart_caption),
    `<cluster-real-estate-explorer lang="de"></cluster-real-estate-explorer>`,
    `<h4>${escapeHtml(content.exploration.observation_heading)}</h4>`,
    bulletList(content.exploration.observations),
    `<h3>${escapeHtml(content.structuring.heading)}</h3>`,
    paragraph(content.structuring.intro),
    paragraph(content.structuring.dataset_intro),
    `<h4>${escapeHtml(content.structuring.table_heading)}</h4>`,
    simpleTable(structuringHeaders, structuringRows),
    `<h4>${escapeHtml(content.structuring.comparison_heading)}</h4>`,
    paragraph(content.structuring.comparison_intro),
    ...content.structuring.k_explanations.flatMap((section) => [
      `<h5>${escapeHtml(section.heading)}</h5>`,
      bulletList(section.bullets),
    ]),
    `<h4>${escapeHtml(content.structuring.outlier_heading)}</h4>`,
    paragraph(content.structuring.outlier_body),
    `<h4>${escapeHtml(content.structuring.principles_heading)}</h4>`,
    bulletList(content.structuring.principles),
    `<h3>${escapeHtml(content.concept.heading)}</h3>`,
    paragraph(content.concept.intro),
    renderConceptSections(content.concept.sections),
    `<h4>${escapeHtml(content.concept.applications_heading)}</h4>`,
    paragraph(content.concept.applications_intro),
    bulletList(content.concept.applications),
    `<h3>${escapeHtml(content.exercises.heading)}</h3>`,
    paragraph(content.exercises.intro),
    `<h4>${escapeHtml(content.exercises.dataset_heading)}</h4>`,
    paragraph(content.exercises.dataset_intro),
    simpleTable(content.exercises.table_columns, content.exercises.table_rows),
    paragraph(content.exercises.axis_note),
    `<h4>${escapeHtml(content.exercises.tabs.line.label)}</h4>`,
    bulletList(content.exercises.tabs.line.items),
    `<h4>${escapeHtml(content.exercises.tabs.circles.label)}</h4>`,
    paragraph(content.exercises.tabs.circles.intro),
    bulletList(content.exercises.tabs.circles.clusters),
    ...content.exercises.tabs.circles.paragraphs.map((text) => paragraph(text)),
    `<h4>${escapeHtml(content.exercises.tabs.outlier.label)}</h4>`,
    paragraph(content.exercises.tabs.outlier.intro),
    bulletList(content.exercises.tabs.outlier.items),
    `<h4>${escapeHtml(content.exercises.key_takeaways_heading)}</h4>`,
    bulletList(content.exercises.key_takeaways),
  ].join("\n\n");
}

function renderMeanFormula() {
  return [
    `<div class="am-cluster-box">`,
    `  <div class="am-cluster-formula">`,
    `    <div class="am-cluster-formula-scroll">`,
    `      <math display="block" aria-label="Neue Mittelpunktformel">`,
    `        <mrow>`,
    `          <msub><mi>&mu;</mi><mi>j</mi></msub>`,
    `          <mo>=</mo>`,
    `          <mfrac>`,
    `            <mn>1</mn>`,
    `            <msub><mi>N</mi><mi>j</mi></msub>`,
    `          </mfrac>`,
    `          <munder>`,
    `            <mo>&sum;</mo>`,
    `            <mrow><mi>i</mi><mo>&isin;</mo><msub><mi>C</mi><mi>j</mi></msub></mrow>`,
    `          </munder>`,
    `          <msub><mi>x</mi><mi>i</mi></msub>`,
    `        </mrow>`,
    `      </math>`,
    `    </div>`,
    `  </div>`,
    `</div>`,
  ].join("\n");
}

function renderExerciseTasks(exercise) {
  return [
    `<ol>`,
    ...exercise.tasks.map((task, index) =>
      exercise.formula_after_task === index + 1
        ? `  <li>${escapeHtml(task)}\n${renderMeanFormula()}\n  </li>`
        : `  <li>${escapeHtml(task)}</li>`
    ),
    `</ol>`,
  ]
    .join("\n");
}

function renderSummationExpansionFormula() {
  return [
    `<div class="am-cluster-formula am-cluster-formula-secondary">`,
    `  <div class="am-cluster-formula-scroll">`,
    `    <math display="block" aria-label="Summenausdruck ausgeschrieben">`,
    `      <mrow>`,
    `        <msub><mi>x</mi><mn>1</mn></msub>`,
    `        <mo>+</mo>`,
    `        <msub><mi>x</mi><mn>2</mn></msub>`,
    `        <mo>+</mo>`,
    `        <msub><mi>x</mi><mn>3</mn></msub>`,
    `        <mo>+</mo>`,
    `        <mo>&ctdot;</mo>`,
    `        <mo>+</mo>`,
    `        <msub><mi>x</mi><mi>N</mi></msub>`,
    `      </mrow>`,
    `    </math>`,
    `  </div>`,
    `</div>`,
  ].join("\n");
}

function renderDistanceFormulas() {
  return [
    `<div class="am-cluster-box">`,
    `  <div class="am-cluster-formula">`,
    `    <div class="am-cluster-formula-scroll">`,
    `      <math display="block" aria-label="Eindimensionale Distanz">`,
    `        <mrow>`,
    `          <mi>distance</mi><mo>(</mo><mi>a</mi><mo>,</mo><mi>b</mi><mo>)</mo>`,
    `          <mo>=</mo>`,
    `          <mo>|</mo><mi>a</mi><mo>-</mo><mi>b</mi><mo>|</mo>`,
    `        </mrow>`,
    `      </math>`,
    `    </div>`,
    `  </div>`,
    `  <div class="am-cluster-formula-label">In 2D (reale Karte):</div>`,
    `  <div class="am-cluster-formula">`,
    `    <div class="am-cluster-formula-scroll">`,
    `      <math display="block" aria-label="Zweidimensionale euklidische Distanz">`,
    `        <msqrt>`,
    `          <mrow>`,
    `            <msup><mrow><mo>(</mo><msub><mi>x</mi><mn>2</mn></msub><mo>-</mo><msub><mi>x</mi><mn>1</mn></msub><mo>)</mo></mrow><mn>2</mn></msup>`,
    `            <mo>+</mo>`,
    `            <msup><mrow><mo>(</mo><msub><mi>y</mi><mn>2</mn></msub><mo>-</mo><msub><mi>y</mi><mn>1</mn></msub><mo>)</mo></mrow><mn>2</mn></msup>`,
    `          </mrow>`,
    `        </msqrt>`,
    `      </math>`,
    `    </div>`,
    `  </div>`,
    `</div>`,
  ].join("\n");
}

export function renderModule3Page(content) {
  const rawBulletList = (items) =>
    `<ul>\n${items.map((item) => `  <li>${item}</li>`).join("\n")}\n</ul>`;
  const reflectionItems = content.exploration.prompts.map((item) => {
    const [legacyQuestion, legacyAnswer] =
      typeof item === "string" ? item.split(">").map((part) => part?.trim()) : [];
    const questionPart = typeof item === "string" ? legacyQuestion : item.question;
    const answerPart = typeof item === "string" ? legacyAnswer : item.answer;
    if (!answerPart) {
      return `<li>${escapeHtml(questionPart)}</li>`;
    }
    return [
      "<li>",
      `  <p>${escapeHtml(questionPart)}</p>`,
      `  <p><em>&gt; ${escapeHtml(answerPart)}</em></p>`,
      "</li>",
    ].join("\n");
  });
  return [
    `<p class="am-cluster-lead">${escapeHtml(content.intro)}</p>`,
    `<h3>${escapeHtml(content.exploration.heading)}</h3>`,
    `<h4>${escapeHtml(content.exploration.scenario_heading)}</h4>`,
    paragraph(content.exploration.scenario),
    bulletList(content.exploration.scenario_points),
    `<h4>${escapeHtml(content.exploration.question_heading)}</h4>`,
    paragraph(content.exploration.question),
    `<h4>${escapeHtml(content.exploration.reflection_heading)}</h4>`,
    `<ul>\n${reflectionItems.map((item) => `  ${item}`).join("\n")}\n</ul>`,
    `<h4>${escapeHtml(content.exploration.task_heading)}</h4>`,
    numberList(content.exploration.task_steps),
    `<h3>${escapeHtml(content.structuring.heading)}</h3>`,
    paragraph(content.structuring.intro),
    `<h4>${escapeHtml(content.structuring.definition_heading)}</h4>`,
    paragraph(content.structuring.definition_body),
    bulletList(content.structuring.definition_points),
    content.structuring.definition_closing
      ? paragraph(content.structuring.definition_closing)
      : "",
    `<h4>${escapeHtml(content.structuring.schoolyard_mapping_heading)}</h4>`,
    bulletList(content.structuring.mapping_items),
    `<h4>${escapeHtml(content.structuring.algorithm_heading)}</h4>`,
    paragraph(content.structuring.algorithm_intro),
    numberList(content.structuring.algorithm_steps),
    `<cluster-kmeans-stepper lang="de"></cluster-kmeans-stepper>`,
    `<h3>${escapeHtml(content.concept.heading)}</h3>`,
    `<h4>${escapeHtml(content.concept.heart_heading)}</h4>`,
    paragraph(content.concept.heart_intro),
    bulletList(content.concept.heart_steps),
    `<h4>${escapeHtml(content.concept.key_formula_heading)}</h4>`,
    content.concept.key_formula_intro
      ? paragraph(content.concept.key_formula_intro)
      : "",
    renderSummationExpansionFormula(),
    renderMeanFormula(),
    paragraph(content.concept.key_formula_note),
    `<h5>${escapeHtml(content.concept.symbol_heading)}</h5>`,
    rawBulletList(content.concept.symbol_items),
    `<h4>${escapeHtml(content.concept.one_dimensional_example.heading)}</h4>`,
    paragraph(content.concept.one_dimensional_example.intro),
    `<h5>${escapeHtml(content.concept.one_dimensional_example.iteration_one_heading)}</h5>`,
    rawBulletList(content.concept.one_dimensional_example.iteration_one_lines),
    `<h5>${escapeHtml(content.concept.one_dimensional_example.iteration_two_heading)}</h5>`,
    rawBulletList(content.concept.one_dimensional_example.iteration_two_lines),
    paragraph(content.concept.one_dimensional_example.result),
    `<h5>${escapeHtml(content.concept.one_dimensional_example.alternate_start_heading)}</h5>`,
    rawBulletList(content.concept.one_dimensional_example.alternate_start_lines),
    content.concept.one_dimensional_example.alternate_result
      ? paragraph(content.concept.one_dimensional_example.alternate_result)
      : "",
    `<h4>${escapeHtml(content.concept.distance_heading)}</h4>`,
    paragraph(content.concept.distance_intro),
    renderDistanceFormulas(),
    `<h4>${escapeHtml(content.concept.two_dimensional_example.heading)}</h4>`,
    content.concept.two_dimensional_example.intro
      ? paragraph(content.concept.two_dimensional_example.intro)
      : "",
    rawBulletList(content.concept.two_dimensional_example.visitor_lines),
    paragraph(content.concept.two_dimensional_example.setup_line),
    `<h5>${escapeHtml(content.concept.two_dimensional_example.distance_formula_heading)}</h5>`,
    `<h5>${escapeHtml(content.concept.two_dimensional_example.iteration_one_heading)}</h5>`,
    rawBulletList(content.concept.two_dimensional_example.iteration_one_lines),
    `<h5>${escapeHtml(content.concept.two_dimensional_example.iteration_two_heading)}</h5>`,
    paragraph(content.concept.two_dimensional_example.result),
    infoBox(content.concept.dimension_note_heading, content.concept.dimension_note_body),
    `<h3 class="aufgabe">${escapeHtml(content.exercises.heading)}</h3>`,
    paragraph(content.exercises.intro),
    content.exercises.visitors_heading
      ? paragraph(content.exercises.visitors_heading)
      : "",
    content.exercises.visitors ? bulletList(content.exercises.visitors) : "",
    `<cluster-kmeans-distance-exercise lang="de"></cluster-kmeans-distance-exercise>`,
    ...content.exercises.exercise_blocks.flatMap((exercise) => [
      `<h4>${escapeHtml(exercise.heading)}</h4>`,
      paragraph(exercise.dataset_intro),
      exercise.setup_items ? bulletList(exercise.setup_items) : "",
      ...(exercise.followup_lines || []).map((line) => paragraph(line)),
      renderExerciseTasks(exercise),
    ]),
  ].join("\n\n");
}

export function renderModule4Page(content) {
  const adTable = simpleTable(
    content.exploration.dataset_table_headers,
    content.exploration.dataset_table_rows
  );
  const conceptRule = (rule) =>
    [
      `<h4>${escapeHtml(rule.heading)}</h4>`,
      paragraph(rule.intro),
      `<ul>`,
      ...rule.points.map((point) =>
        [
          `  <li><strong>${escapeHtml(point.label)}</strong> ${
            point.text ? escapeHtml(point.text) : ""
          }`,
          point.items ? bulletList(point.items) : "",
          `  </li>`,
        ]
          .filter(Boolean)
          .join("\n")
      ),
      `</ul>`,
    ].join("\n");
  const scenarioPatternList = (patterns) =>
    [
      `<ul>`,
      ...patterns.map((pattern) =>
        [
          `  <li>${escapeHtml(pattern.label)}`,
          `    <p><em>${escapeHtml(pattern.note)}</em></p>`,
          `  </li>`,
        ].join("\n")
      ),
      `</ul>`,
    ].join("\n");
  const exerciseStep = (step) =>
    [
      `<h4>${escapeHtml(step.heading)}</h4>`,
      step.intro ? paragraph(step.intro) : "",
      step.prompt ? paragraph(step.prompt) : "",
      step.items ? bulletList(step.items) : "",
      ...(step.paragraphs || []).map((text) => paragraph(text)),
      step.closing ? paragraph(step.closing) : "",
    ]
      .filter(Boolean)
      .join("\n");
  const knowledgeCheck = (items) =>
    [
      `<ol>`,
      ...items.map((item) =>
        [
          `  <li>`,
          `    <p>${escapeHtml(item.scenario)}</p>`,
          `    <p><em>&gt; ${escapeHtml(item.answer)}</em></p>`,
          `  </li>`,
        ].join("\n")
      ),
      `</ol>`,
    ].join("\n");
  return [
    `<p class="am-cluster-lead">${escapeHtml(content.intro)}</p>`,
    `<h3>${escapeHtml(content.exploration.heading)}</h3>`,
    `<h4>${escapeHtml(content.exploration.scenario_heading)}</h4>`,
    paragraph(content.exploration.scenario),
    paragraph(content.exploration.scenario_followup),
    `<h4>${escapeHtml(content.exploration.interactive_heading)}</h4>`,
    paragraph(content.exploration.interactive_intro),
    `<h4>${escapeHtml(content.exploration.dataset_table_heading)}</h4>`,
    adTable,
    paragraph(content.exploration.dataset_observation),
    `<h4>${escapeHtml(content.exploration.experiment_heading)}</h4>`,
    paragraph(content.exploration.experiment_intro),
    paragraph(content.exploration.experiment_membership_intro),
    bulletList(content.exploration.experiment_membership_examples),
    paragraph(content.exploration.experiment_summary),
    `<cluster-ad-fuzzy-explorer lang="de"></cluster-ad-fuzzy-explorer>`,
    `<h4>${escapeHtml(content.exploration.big_idea_heading)}</h4>`,
    ...content.exploration.big_idea_paragraphs.map((text) => paragraph(text)),
    `<h3>${escapeHtml(content.structuring.heading)}</h3>`,
    ...content.structuring.intro_paragraphs.map((text) => paragraph(text)),
    `<h4>${escapeHtml(content.structuring.scenario_heading)}</h4>`,
    paragraph(content.structuring.ad_list_intro),
    bulletList(content.structuring.ad_list),
    ...content.structuring.scenario_paragraphs.map((text) => paragraph(text)),
    `<h4>${escapeHtml(content.structuring.hierarchy_heading)}</h4>`,
    ...content.structuring.hierarchy_paragraphs.map((text) => paragraph(text)),
    bulletList(content.structuring.hierarchy_points),
    `<h4>${escapeHtml(content.structuring.strategic_cut_heading)}</h4>`,
    ...content.structuring.strategic_cut_paragraphs.map((text) => paragraph(text)),
    `<cluster-ad-hierarchy-explorer lang="de"></cluster-ad-hierarchy-explorer>`,
    `<h4>${escapeHtml(content.structuring.big_picture_heading)}</h4>`,
    ...content.structuring.big_picture_paragraphs.map((text) => paragraph(text)),
    `<h3>${escapeHtml(content.concept.heading)}</h3>`,
    paragraph(content.concept.intro),
    ...content.concept.rules.map((rule) => conceptRule(rule)),
    `<h4>${escapeHtml(content.concept.tool_choice_heading)}</h4>`,
    bulletList(content.concept.tool_choice_items),
    paragraph(content.concept.tool_choice_body),
    `<h4>${escapeHtml(content.concept.noise_heading)}</h4>`,
    paragraph(content.concept.noise_body),
    bulletList(content.concept.noise_items),
    paragraph(content.concept.noise_important),
    `<h4>${escapeHtml(content.concept.density_heading)}</h4>`,
    paragraph(content.concept.density_intro),
    `<cluster-density-comparison lang="de"></cluster-density-comparison>`,
    `<h3 class="aufgabe">${escapeHtml(content.exercises.heading)}</h3>`,
    `<h4>${escapeHtml(content.exercises.intro_heading)}</h4>`,
    ...content.exercises.intro_paragraphs.map((text) => paragraph(text)),
    `<h4>${escapeHtml(content.exercises.scenario_heading)}</h4>`,
    paragraph(content.exercises.scenario_intro),
    scenarioPatternList(content.exercises.scenario_patterns),
    paragraph(content.exercises.scenario_followup),
    ...content.exercises.steps.map((step) => exerciseStep(step)),
    `<h4>${escapeHtml(content.exercises.knowledge_check_heading)}</h4>`,
    paragraph(content.exercises.knowledge_check_intro),
    knowledgeCheck(content.exercises.knowledge_check_items),
  ].join("\n\n");
}
