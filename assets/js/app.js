(function () {
  const data = window.SITE_DATA;
  const pageId = document.body.dataset.page || "home";
  const root = document.getElementById("site-root");

  if (!data || !root) {
    return;
  }

  const localPages = new Set(data.nav.flatMap((item) => [item.page, ...(item.children || []).map((child) => child.page)]));

  function isExternal(href) {
    return /^https?:\/\//.test(href) || href.startsWith("mailto:");
  }

  function isLocalHttp(href) {
    return /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:\/|$)/i.test(href);
  }

  function linkAttrs(href, link = {}) {
    if (link.newTab) {
      return ' target="_blank" rel="noreferrer noopener"';
    }
    if (link.sameTab || isLocalHttp(href)) {
      return "";
    }
    if (isExternal(href)) {
      return ' target="_blank" rel="noreferrer noopener"';
    }
    if (/\.(pdf|docx)$/i.test(href)) {
      return ' target="_blank"';
    }
    return "";
  }

  function buttonLink(link, extraClass = "") {
    const classes = ["button", link.style || "", extraClass].filter(Boolean).join(" ");
    return `<a class="${classes}" href="${link.href}"${linkAttrs(link.href, link)}>${link.label}</a>`;
  }

  function image(src, alt, cls = "", eager = false) {
    const loading = eager ? "eager" : "lazy";
    return `<img class="${cls}" src="${src}" alt="${alt}" loading="${loading}" decoding="async">`;
  }

  function logoSvg() {
    return `
      <svg class="brand-logo" preserveAspectRatio="xMidYMid meet" viewBox="34 24.55 131.9 151.05" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M100.9 24.7c-.5-.2-1.2-.2-1.7 0L37.3 52.8l-.4.2-.2.1-1.5.7c-.7.3-1.2 1.1-1.2 1.9v93.8c0 .8.5 1.5 1.2 1.9l53.3 24c.3.1.6.2.8.2.3 0 .6-.1.9-.2l74.5-33.9c.7-.3 1.2-1.1 1.2-1.9V55.7c0-.8-.5-1.5-1.2-1.9l-63.8-29.1zm-.9 4.1l57.7 26.3-20.9 9.5L100.9 47c-.6-.3-1.3-.3-1.8 0L63.6 64.8l-21.3-9.7L100 28.8zM90 138.7l-18.7-7.6 19.3-8.2 17.3 7.8-17.9 8zm-1.3-19.4l-23.2 9.9V68.4L100 51.2l12.4 6.2v25.3L90 91.6c-.8.3-1.3 1-1.3 1.8v25.9zm46-28.2l-18.2-8.2V59.3l18.2 8.9v22.9zm-41.9 5.7l18.2 8.7v22.1l-18.2-8.2V96.8zm20.9 5.4l-17.8-8.5 18.3-7.3 17.4 7.8-17.9 8zm-26.4 39.9v28.2l-49.2-22.2V57.7l23.3 10.6v62.4c0 1.1 1 1.7 2.1 2.1l23.8 9.3zm4.2 28.2v-27.7l21.8-9.8c1.2-.5 1.8-1.1 1.8-2v-24.7l22.7-10.3c.8-.5.9-1.4.9-2.1V68.2l23.1-10.5v80.5l-70.3 32.1z"></path>
      </svg>
    `;
  }

  function renderHeader() {
    const nav = data.nav.map((item) => {
      const childActive = (item.children || []).some((child) => child.page === pageId);
      const active = item.page === pageId || childActive;
      if (item.children) {
        const children = item.children.map((child) => {
          const childClass = child.page === pageId ? "active" : "";
          return `<a class="${childClass}" href="${child.href}">${child.label}</a>`;
        }).join("");

        return `
          <div class="nav-item">
            <a href="${item.href}" class="dropdown-trigger ${active ? "active" : ""}">
              ${item.label}
            </a>
            <div class="dropdown-menu">${children}</div>
          </div>
        `;
      }
      return `<a class="nav-link ${active ? "active" : ""}" href="${item.href}">${item.label}</a>`;
    }).join("");

    return `
      <header class="site-header">
        <div class="header-inner">
          <a class="brand" href="index.html" aria-label="Nathan Pacey home">
            ${logoSvg()}
            <span>Nathan Pacey</span>
          </a>
          <button class="nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
          <nav class="site-nav" aria-label="Primary navigation">${nav}</nav>
        </div>
      </header>
    `;
  }

  function renderFooter() {
    const social = data.social.map((item) => `
      <a href="${item.href}"${linkAttrs(item.href)} aria-label="${item.label}">
        ${image(item.icon, item.label, "", true)}
      </a>
    `).join("");
    return `
      <footer class="site-footer">
        <div class="footer-grid">
          <div>
            <p>&copy; 2021 by Nathan Pacey.</p>
          </div>
          <div class="footer-block">
            <span>Call</span>
            <a href="tel:+12269883313">${data.site.shortPhone}</a>
          </div>
          <div class="footer-block">
            <span>Write</span>
            <a href="mailto:${data.site.email}">${data.site.email}</a>
          </div>
          <div class="footer-block">
            <span>Follow</span>
            <div class="social-row">${social}</div>
          </div>
        </div>
      </footer>
    `;
  }

  function renderPageHero({ eyebrow, title, lede, image: heroImage }) {
    return `
      <section class="page-hero">
        <div class="wrap page-hero-grid">
          <div>
            <p class="eyebrow">${eyebrow || ""}</p>
            <h1 class="page-title">${title}</h1>
            <p class="section-lede">${lede || ""}</p>
          </div>
          ${heroImage ? `<div class="hero-media">${image(heroImage, title, "", true)}</div>` : ""}
        </div>
      </section>
    `;
  }

  function renderLinkRow(links) {
    if (!links || !links.length) return "";
    return `<div class="link-row">${links.map((link) => buttonLink(link, "small")).join("")}</div>`;
  }

  function renderProjectCard(project) {
    return `
      <article class="project-card">
        ${image(project.image, project.title, "project-image")}
        <div class="project-content">
          <h3>${project.title}</h3>
          <p>${project.text}</p>
          ${renderLinkRow(project.links)}
        </div>
      </article>
    `;
  }

  function renderHome() {
    const home = data.home;
    const social = data.social.map((item) => `
      <a href="${item.href}"${linkAttrs(item.href)} aria-label="${item.label}">
        ${image(item.icon, item.label, "", true)}
      </a>
    `).join("");
    return `
      <section class="home-original" style="--home-bg-image: url('${home.backgroundImage}')">
        <div class="home-bg-image" aria-hidden="true"></div>
        <div class="home-original-inner">
          <aside class="home-profile-card">
            <div class="home-profile-main">
              ${image(home.portrait, "Nathan Pacey portrait", "home-profile-photo", true)}
              <h1>${home.title.replace(" ", "<br>")}</h1>
              <div class="home-rule"></div>
              <p>${home.roleLines.join("<br>")}</p>
              <a class="home-iqc-logo" href="${home.logos[0].href}"${linkAttrs(home.logos[0].href)}>
                ${image(home.logos[0].image, home.logos[0].label, "", true)}
              </a>
            </div>
            <div class="home-social-strip">${social}</div>
          </aside>
          <div class="home-copy-original">
            <h2>${home.intro}</h2>
            <p class="tagline">${home.tagline}</p>
            <div class="cta-row">${home.ctas.slice(0, 2).map((link) => buttonLink(link)).join("")}</div>
            <p>${home.body[0]}</p>
            <a class="home-epfl-logo" href="${home.logos[2].href}"${linkAttrs(home.logos[2].href)}>
              ${image(home.logos[2].image, home.logos[2].label, "", true)}
            </a>
            <p>${home.body[1]}</p>
            <p>${home.body[2]}</p>
            <a class="home-queens-logo" href="${home.logos[1].href}"${linkAttrs(home.logos[1].href)}>
              ${image(home.logos[1].image, home.logos[1].label, "", true)}
            </a>
            <p>${home.body[3]}</p>
            <div class="home-footer-cta">${buttonLink(home.ctas[2])}</div>
          </div>
        </div>
      </section>
    `;
  }

  function renderProjectCategory(category) {
    const helperText = /click the image/i.test(category.text) ? "" : "<p>Click the image to see my work.</p>";
    const iconMarkup = category.icon
      ? `
        <span class="category-icon">
          ${category.icon.href
            ? `<a href="${category.icon.href}"${linkAttrs(category.icon.href)} aria-label="${category.title} external link">
                <img src="${category.icon.image}" alt="${category.title} icon" loading="lazy" decoding="async">
              </a>`
            : `<img src="${category.icon.image}" alt="${category.title} icon" loading="lazy" decoding="async">`}
        </span>
      `
      : "";
    return `
      <article class="category-band">
        <div class="category-text">
          <span class="side-accent"></span>
          ${iconMarkup}
          <a class="category-panel-link" href="${category.href}">
            <h2>${category.title}</h2>
            <p>${category.text}</p>
            ${helperText}
          </a>
        </div>
        <a class="category-image-link" href="${category.href}" aria-label="${category.title}">
          ${image(category.image, category.title, "category-image")}
        </a>
      </article>
    `;
  }

  function renderProjects() {
    const page = data.projects;
    const cards = page.categories.map(renderProjectCategory).join("");
    return `
      <section class="projects-original">
        <div class="wrap projects-intro">
          <h1><span></span>${page.title}</h1>
          <p>${page.lede}</p>
        </div>
        <div class="project-category-list">${cards}</div>
      </section>
    `;
  }

  function renderProjectParagraphs(project) {
    const paragraphs = project.paragraphs || (project.text ? [project.text] : []);
    return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
  }

  function renderDetailLinks(links) {
    if (!links || !links.length) return "";
    return `
      <div class="detail-link-list">
        ${links.map((link) => `<a href="${link.href}"${linkAttrs(link.href, link)}>${link.label}</a>`).join("")}
      </div>
    `;
  }

  function renderProjectRow(project, index) {
    const reverse = index % 2 === 1 ? "reverse" : "";
    const media = project.video
      ? `<video class="detail-video" autoplay muted loop playsinline preload="metadata" poster="${project.image}"><source src="${project.video}" type="video/mp4"></video>`
      : image(project.image, project.title, "detail-image");
    return `
      <article class="detail-row ${reverse}">
        <div class="detail-media">${media}</div>
        <div class="detail-copy">
          ${project.icon ? `
            <a class="detail-inline-icon" href="${project.icon.href}"${linkAttrs(project.icon.href, project.icon)} aria-label="${project.icon.alt || project.title}">
              ${image(project.icon.image, project.icon.alt || project.title, "", true)}
            </a>
          ` : ""}
          <h2>${project.title}</h2>
          ${renderProjectParagraphs(project)}
          ${renderDetailLinks(project.links)}
          ${project.cta ? `<div class="detail-cta">${buttonLink(project.cta)}</div>` : ""}
        </div>
      </article>
    `;
  }

  function renderCodeFeature(feature) {
    if (!feature) return "";
    return `
      <section class="code-feature" aria-label="GitHub and LeetCode">
        <div class="code-feature-inner">
          <div class="code-link-row">
            <img src="${feature.githubIcon}" alt="GitHub" loading="eager" decoding="async">
            <a href="${feature.github}"${linkAttrs(feature.github)}>GitHub</a>
          </div>
          <div class="code-link-row">
            <img src="${feature.leetcodeIcon}" alt="LeetCode" loading="eager" decoding="async">
            <a href="${feature.leetcode}"${linkAttrs(feature.leetcode)}>LeetCode</a>
          </div>
          <div class="code-stats">
            <strong>Rank: ${feature.rank}</strong>
            <strong>Solved: ${feature.solved}</strong>
          </div>
          <div class="code-progress" aria-label="LeetCode solved progress">
            <span style="width: ${feature.progress}%"></span>
          </div>
        </div>
      </section>
    `;
  }

  function renderProjectPage(projectKey) {
    const page = data.projectPages[projectKey];
    return `
      <section class="project-detail-original">
        <div class="detail-title-wrap">
          <h1>${page.title}</h1>
          ${page.lede ? `<p>${page.lede}</p>` : ""}
        </div>
        <div class="detail-list">
          ${page.projects.map(renderProjectRow).join("")}
        </div>
        ${projectKey === "software" ? renderCodeFeature(page.codeFeature) : ""}
      </section>
    `;
  }

  function renderVppLaunch() {
    const page = data.vppLaunch;
    return `
      <section class="page-hero">
        <div class="wrap page-hero-grid vpp-launch-hero">
          <div>
            <p class="eyebrow">${page.eyebrow}</p>
            <h1 class="page-title">${page.title}</h1>
            <p class="section-lede">${page.lede}</p>
            <div class="cta-row">
              ${buttonLink({ label: "Watch Demo", href: page.videoUrl, style: "primary" })}
              ${buttonLink({ label: "GitHub", href: page.repoUrl })}
              <span class="button ghost disabled" aria-disabled="true">${page.placeholderLabel}</span>
            </div>
          </div>
          <div class="hero-media">${image(page.preview, page.title, "", true)}</div>
        </div>
      </section>
      <section class="section compact">
        <div class="wrap vpp-launch-grid">
          <article class="card vpp-video-card">
            <span class="playable-badge">Tutorial Video</span>
            <h2>See the workflow in action</h2>
            <p>The walkthrough shows the real interface, analysis flow, and output views without forcing the portfolio to host the Flask application itself.</p>
            <div class="vpp-video-shell">
              <iframe
                src="${page.videoEmbedUrl}"
                title="${page.title} video demo"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
          </article>
          <article class="card vpp-summary-card">
            <span class="playable-badge">Project Links</span>
            <h2>Standalone project rollout</h2>
            <p>This keeps the portfolio tidy while the Virtual Power Plant project gets its own proper Flask hosting setup in its own repository.</p>
            <ul class="vpp-simple-list">
              ${page.projectNotes.map((item) => `<li>${item}</li>`).join("")}
            </ul>
            <div class="cta-row">
              ${buttonLink({ label: "Open GitHub Repo", href: page.repoUrl, style: "primary" })}
              ${buttonLink({ label: "Open Tutorial Video", href: page.videoUrl })}
              <span class="button ghost disabled" aria-disabled="true">${page.placeholderLabel}</span>
            </div>
            <p class="vpp-placeholder-note">The live app button will point to the dedicated hosted VPP site once that deployment is ready.</p>
          </div>
        </div>
      </section>
    `;
  }

  function renderAsteroidLaunch() {
    const page = data.asteroidLaunch;
    return `
      <section class="page-hero">
        <div class="wrap page-hero-grid playable-hero-grid">
          <div>
            <p class="eyebrow">${page.eyebrow}</p>
            <h1 class="page-title">${page.title}</h1>
            <p class="section-lede">${page.lede}</p>
            <div class="cta-row">
              ${buttonLink({ label: "Play Now", href: "#asteroid-stage", style: "primary", sameTab: true })}
              ${buttonLink({ label: "Watch Demo", href: page.demoVideo, newTab: true })}
              ${buttonLink({ label: "GitHub", href: page.repoUrl })}
            </div>
          </div>
          <div class="hero-media">${image(page.preview, page.title, "", true)}</div>
        </div>
      </section>
      <section class="section compact">
        <div class="wrap playable-grid">
          <article class="card playable-info-card">
            <span class="playable-badge">Browser Port of the Original Pygame Build</span>
            <h2>Controls</h2>
            <ul class="playable-list">
              ${page.controls.map((item) => `<li>${item}</li>`).join("")}
            </ul>
            <div class="playable-meta-list">
              <div class="playable-meta-item">
                <span>Original source</span>
                <strong>${page.sourcePath}</strong>
              </div>
              <div class="playable-meta-item">
                <span>Asset folder</span>
                <strong>${page.assetPath}</strong>
              </div>
            </div>
          </article>
          <article class="card playable-stage-card" id="asteroid-stage">
            <div class="playable-stage-top">
              <div>
                <h2>Live Browser Game</h2>
                <p>Fly the rocket through the asteroid belt and avoid incoming missiles.</p>
              </div>
              <div class="playable-stats">
                <span>Score <strong data-asteroid-score>0</strong></span>
                <span>Best <strong data-asteroid-best>0</strong></span>
                <span>Hits <strong data-asteroid-kills>0</strong></span>
                <span>Sector <strong data-asteroid-sector>Launch Corridor</strong></span>
              </div>
            </div>
            <div class="arcade-frame">
              <canvas class="arcade-canvas" data-asteroid-canvas width="800" height="600" tabindex="0" aria-label="Asteroid Belt Adventure browser game"></canvas>
            </div>
            <div class="arcade-toolbar">
              <button class="button primary" type="button" data-asteroid-start>Start Game</button>
              <button class="button" type="button" data-asteroid-pause>Pause</button>
              <button class="button" type="button" data-asteroid-reset>Reset</button>
              <span class="playable-inline-status" data-asteroid-status>Loading assets...</span>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function renderGameOfLifeLaunch() {
    const page = data.gameOfLifeLaunch;
    return `
      <section class="page-hero">
        <div class="wrap page-hero-grid playable-hero-grid">
          <div>
            <p class="eyebrow">${page.eyebrow}</p>
            <h1 class="page-title">${page.title}</h1>
            <p class="section-lede">${page.lede}</p>
            <div class="cta-row">
              ${buttonLink({ label: "Open Simulator", href: "#life-stage", style: "primary", sameTab: true })}
              ${buttonLink({ label: "Watch Demo", href: page.demoVideo, newTab: true })}
              ${buttonLink({ label: "GitHub", href: page.repoUrl })}
            </div>
          </div>
          <div class="hero-media">${image(page.preview, page.title, "", true)}</div>
        </div>
      </section>
      <section class="section compact">
        <div class="wrap playable-grid">
          <article class="card playable-info-card">
            <img class="playable-logo-image" src="${page.logo}" alt="${page.title}" loading="eager" decoding="async">
            <h2>Grid Setup</h2>
            <div class="playable-form-grid">
              <label class="playable-field">
                <span>Width</span>
                <input type="number" min="4" max="45" value="20" data-life-width>
              </label>
              <label class="playable-field">
                <span>Height</span>
                <input type="number" min="4" max="30" value="16" data-life-height>
              </label>
              <button class="button primary" type="button" data-life-build>Build Grid</button>
            </div>
            <ul class="playable-list">
              <li>Click any cell to toggle life on or off.</li>
              <li>The rules match the original bounded-grid Pygame version.</li>
              <li>Use Start once, then advance generation by generation with Next.</li>
            </ul>
            <div class="playable-meta-list">
              <div class="playable-meta-item">
                <span>Main source</span>
                <strong>${page.sourcePath}</strong>
              </div>
              <div class="playable-meta-item">
                <span>Start screen source</span>
                <strong>${page.startScreenPath}</strong>
              </div>
            </div>
          </article>
          <article class="card playable-stage-card" id="life-stage">
            <div class="playable-stage-top">
              <div>
                <h2>Interactive Simulation</h2>
                <p>Set a pattern, evolve the board, and explore how clusters behave at fixed edges.</p>
              </div>
              <div class="playable-stats">
                <span>Generation <strong data-life-generation>0</strong></span>
                <span>Living <strong data-life-living>0</strong></span>
                <span>Status <strong data-life-mode>Editing</strong></span>
              </div>
            </div>
            <div class="life-board-shell">
              <canvas class="life-canvas" data-life-canvas tabindex="0" aria-label="Game of Life board"></canvas>
            </div>
            <div class="arcade-toolbar">
              <button class="button primary" type="button" data-life-step>Start</button>
              <button class="button" type="button" data-life-clear>Clear</button>
              <span class="playable-inline-status" data-life-status>Build a grid or click cells to start.</span>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function renderAbout() {
    const about = data.about;
    const cards = about.interests.map((item) => `
      <article class="about-interest-card">
        <div class="about-interest-header">
          <h3>${item.title}</h3>
          <div class="about-interest-line"></div>
        </div>
        ${image(item.image, item.title, "about-interest-image")}
        <p>${item.text}</p>
      </article>
    `).join("");
    return `
      <section class="about-original">
        <div class="about-hero-stack">
          <section class="about-top-band">
            <div class="about-top-image">${image(about.image, about.title, "", true)}</div>
            <div class="about-top-fill" aria-hidden="true"></div>
          </section>
          <section class="about-top-copy">
            <div class="about-top-copy-inner">
              <div class="about-copy-spacer" aria-hidden="true"></div>
              <div class="about-copy-block">
                <h1>${about.title}</h1>
                <p>${about.lede}</p>
              </div>
            </div>
          </section>
        </div>
        <section class="about-interests-section">
          <div class="about-interests-grid">${cards}</div>
        </section>
        <section class="about-cta-strip">
          <div class="about-cta-row">${about.ctas.map((link) => buttonLink(link)).join("")}</div>
        </section>
      </section>
    `;
  }


  function renderResumeLogos(item) {
    const logos = item.logos || (item.logo ? [{
      src: item.logo,
      alt: item.place || item.school || item.title,
      width: item.logoWidth,
      height: item.logoHeight
    }] : []);
    if (!logos.length) return "";
    return `
      <div class="resume-entry-logo-strip">
        ${logos.map((logo) => {
          const vars = [
            logo.width ? `--logo-width:${logo.width}px` : "",
            logo.height ? `--logo-height:${logo.height}px` : ""
          ].filter(Boolean).join(";");
          return `
            <div class="resume-entry-logo"${vars ? ` style="${vars}"` : ""}>
              ${image(logo.src, logo.alt || item.place || item.school || item.title, "", true)}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderResumeEntry(item) {
    return `
      <article class="resume-entry-card">
        <div class="resume-entry-side">
          <div class="resume-entry-brand">
            <h3>${item.title}</h3>
            <p class="resume-entry-place">${item.place || item.school}</p>
          </div>
          <div class="resume-entry-meta">
            <span>${item.period}</span>
            <small>${item.location}</small>
          </div>
        </div>
        <div class="resume-entry-body">
          ${renderResumeLogos(item)}
          <ul class="resume-entry-list">${item.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>
          ${item.links && item.links.length ? `
            <div class="resume-entry-links">
              ${item.links.map((link) => buttonLink(link, "small")).join("")}
            </div>
          ` : ""}
        </div>
      </article>
    `;
  }

  function renderResume() {
    const resume = data.resume;
    const experienceCards = resume.experience.map(renderResumeEntry).join("");
    const educationCards = resume.education.map(renderResumeEntry).join("");
    const skillTiles = resume.skills.map((skill) => `
      <div class="skill-tile">
        ${image(skill.icon, skill.name, "", true)}
        <span>${skill.name}</span>
      </div>
    `).join("");
    const professional = resume.professional.map((skill) => `<span class="pill">${skill}</span>`).join("");
    const courses = resume.courses.map((course) => `<span class="pill">${course}</span>`).join("");
    const interests = resume.interests.map((item) => `<li>${item}</li>`).join("");
    const technical = resume.technicalBullets.map((item) => `<li>${item}</li>`).join("");
    return `
      <section class="resume-original">
        <section class="resume-hero-original">
          <div class="resume-hero-inner">
            <div class="resume-hero-copy">
              <h1><span></span>${resume.title}</h1>
              <p class="resume-subtitle">Experience</p>
            </div>
            <a class="button primary" href="${resume.cv}" target="_blank">DOWNLOAD CV</a>
          </div>
        </section>
        <section class="resume-stage">
          <div class="resume-stage-inner">
            <h2>Experience</h2>
            <div class="resume-entry-stack">${experienceCards}</div>
          </div>
        </section>
        <section class="resume-stage resume-stage-alt">
          <div class="resume-stage-inner">
            <h2>Education</h2>
            <div class="resume-entry-stack">${educationCards}</div>
          </div>
        </section>
        <section class="resume-stage">
          <div class="resume-stage-inner resume-skills-stage">
            <div class="resume-panel resume-text-panel">
              <h2>Technical Skills</h2>
              <ul class="resume-plain-list">${technical}</ul>
              <h3>Professional Skillset</h3>
              <div class="pill-grid">${professional}</div>
            </div>
            <div class="resume-panel resume-icons-panel">
              <div class="skills-grid">${skillTiles}</div>
            </div>
            <div class="resume-panel resume-meta-panel">
              <h2>Relevant Courses</h2>
              <div class="pill-grid">${courses}</div>
              <h3>Personal Interests</h3>
              <ul class="resume-plain-list">${interests}</ul>
            </div>
          </div>
        </section>
      </section>
    `;
  }

  function renderVideoCard(video) {
    return `
      <article class="video-card ${video.featured ? "featured-video" : ""}">
        <video controls preload="metadata" poster="${video.poster}" playsinline>
          <source src="${video.source}" type="video/mp4">
        </video>
        <h3>${video.title}</h3>
      </article>
    `;
  }

  function renderSmartwatch() {
    const page = data.smartwatch;
    const heroImages = page.heroImages.map((src, index) => image(src, `${page.title} screenshot ${index + 1}`)).join("");
    return `
      <section class="page-hero">
        <div class="wrap smartwatch-hero">
          <div>
            <p class="eyebrow">${page.eyebrow}</p>
            <h1 class="page-title">${page.title}</h1>
            <p class="section-lede">${page.lede}</p>
            <div class="cta-row">${page.links.map((link) => buttonLink(link)).join("")}</div>
          </div>
          <div class="phone-stack">${heroImages}</div>
        </div>
      </section>
      <section class="section band">
        <div class="wrap">
          <h2 class="section-title">Latest Version 2.0</h2>
          <div class="video-grid featured-grid">${renderVideoCard(page.latestVideo)}</div>
        </div>
      </section>
      <section class="section">
        <div class="wrap">
          <h2 class="section-title">${page.galleryTitle}</h2>
          ${renderGallery(page.gallery)}
        </div>
      </section>
      <section class="section band">
        <div class="wrap">
          <h2 class="section-title">Version 1.0 Tutorial Videos</h2>
          <div class="video-grid">${page.videos.map(renderVideoCard).join("")}</div>
        </div>
      </section>
    `;
  }

  function renderGallery(items) {
    const thumbs = items.map((item, index) => `
      <button class="gallery-thumb ${index === 0 ? "active" : ""}" type="button" data-gallery-index="${index}" aria-label="${item.title}">
        ${image(item.image, item.title)}
      </button>
    `).join("");
    return `
      <div class="gallery-shell" data-gallery>
        <div class="gallery-view">
          <button class="gallery-image-wrap" type="button" data-gallery-open aria-label="Open gallery image">
            ${image(items[0].image, items[0].title, "gallery-main-image")}
          </button>
          <div class="gallery-copy">
            <h3 class="gallery-title">${items[0].title}</h3>
            <p class="gallery-text">${items[0].text}</p>
            <div class="gallery-counter"><span data-gallery-counter>1</span>/${items.length}</div>
            <div class="gallery-actions">
              <button class="icon-button" type="button" data-gallery-prev aria-label="Previous image">&lsaquo;</button>
              <button class="icon-button" type="button" data-gallery-next aria-label="Next image">&rsaquo;</button>
            </div>
          </div>
        </div>
        <div class="gallery-thumbs">${thumbs}</div>
      </div>
    `;
  }

  function renderContact() {
    const site = data.site;
    const social = data.social.map((item) => `
      <a href="${item.href}"${linkAttrs(item.href)} aria-label="${item.label}">
        ${image(item.icon, item.label, "", true)}
      </a>
    `).join("");
    return `
      <section class="page-hero">
        <div class="wrap">
          <p class="eyebrow">CONTACT</p>
          <h1 class="page-title">Let's Connect</h1>
          <p class="section-lede">I am always interested in new opportunities, so feel free to contact me.</p>
        </div>
      </section>
      <section class="section band">
        <div class="wrap contact-grid">
          <div class="contact-list">
            <div class="contact-item"><span>Address</span><strong>${site.address}</strong></div>
            <div class="contact-item"><span>Email</span><a href="mailto:${site.email}">${site.email}</a></div>
            <div class="contact-item"><span>Phone</span><a href="tel:+12269883313">${site.phone}</a></div>
            <div class="contact-item"><span>Social Media</span><div class="social-row">${social}</div></div>
          </div>
          <form class="contact-form" data-contact-form>
            <div class="field">
              <label for="firstName">First Name</label>
              <input id="firstName" name="firstName" autocomplete="given-name" required>
            </div>
            <div class="field">
              <label for="lastName">Last Name</label>
              <input id="lastName" name="lastName" autocomplete="family-name" required>
            </div>
            <div class="field full">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" autocomplete="email" required>
            </div>
            <div class="field full">
              <label for="message">Message</label>
              <textarea id="message" name="message" required></textarea>
            </div>
            <button class="button primary" type="submit">Send</button>
            <p class="form-status" data-form-status aria-live="polite"></p>
          </form>
        </div>
      </section>
    `;
  }

  function renderLightbox() {
    return `
      <div class="lightbox" data-lightbox aria-hidden="true">
        <button class="icon-button lightbox-close" type="button" data-lightbox-close aria-label="Close image">&times;</button>
        <div class="lightbox-panel">
          <img data-lightbox-image src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="">
          <div class="lightbox-caption">
            <h3 data-lightbox-title></h3>
            <p data-lightbox-text></p>
          </div>
        </div>
      </div>
    `;
  }

  function renderMain() {
    const routes = {
      home: renderHome,
      about: renderAbout,
      resume: renderResume,
      projects: renderProjects,
      physics: () => renderProjectPage("physics"),
      software: () => renderProjectPage("software"),
      mechatronics: () => renderProjectPage("mechatronics"),
      vpp: renderVppLaunch,
      asteroid: renderAsteroidLaunch,
      life: renderGameOfLifeLaunch,
      smartwatch: renderSmartwatch,
      contact: renderContact
    };
    const standalonePages = new Set(["smartwatch", "vpp", "asteroid", "life"]);
    const renderer = routes[localPages.has(pageId) || standalonePages.has(pageId) ? pageId : "home"] || routes.home;
    return renderer();
  }

  function initNavigation() {
    const toggle = document.querySelector(".nav-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      const open = !document.body.classList.contains("menu-open");
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const firstName = formData.get("firstName") || "";
      const lastName = formData.get("lastName") || "";
      const fromEmail = formData.get("email") || "";
      const message = formData.get("message") || "";
      const subject = encodeURIComponent(`Portfolio Contact from ${firstName} ${lastName}`.trim());
      const body = encodeURIComponent(`Name: ${firstName} ${lastName}\nEmail: ${fromEmail}\n\n${message}`);
      const mailto = `mailto:${data.site.email}?subject=${subject}&body=${body}`;
      const status = document.querySelector("[data-form-status]");
      if (status) status.textContent = "Thanks for submitting. Your email client should open now.";
      window.location.href = mailto;
    });
  }

  function initGallery() {
    const shell = document.querySelector("[data-gallery]");
    if (!shell) return;
    const items = data.smartwatch.gallery;
    let index = 0;
    const mainImage = shell.querySelector(".gallery-main-image");
    const title = shell.querySelector(".gallery-title");
    const text = shell.querySelector(".gallery-text");
    const counter = shell.querySelector("[data-gallery-counter]");
    const thumbs = Array.from(shell.querySelectorAll("[data-gallery-index]"));

    function update(nextIndex) {
      index = (nextIndex + items.length) % items.length;
      const item = items[index];
      mainImage.src = item.image;
      mainImage.alt = item.title;
      title.textContent = item.title;
      text.textContent = item.text;
      counter.textContent = String(index + 1);
      thumbs.forEach((thumb, thumbIndex) => thumb.classList.toggle("active", thumbIndex === index));
    }

    shell.querySelector("[data-gallery-prev]").addEventListener("click", () => update(index - 1));
    shell.querySelector("[data-gallery-next]").addEventListener("click", () => update(index + 1));
    shell.querySelector("[data-gallery-open]").addEventListener("click", () => openLightbox(items[index]));
    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => update(Number(thumb.dataset.galleryIndex)));
    });
  }

  function openLightbox(item) {
    const lightbox = document.querySelector("[data-lightbox]");
    if (!lightbox) return;
    lightbox.querySelector("[data-lightbox-image]").src = item.image;
    lightbox.querySelector("[data-lightbox-image]").alt = item.title;
    lightbox.querySelector("[data-lightbox-title]").textContent = item.title;
    lightbox.querySelector("[data-lightbox-text]").textContent = item.text;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  }

  function initLightbox() {
    const lightbox = document.querySelector("[data-lightbox]");
    if (!lightbox) return;
    const close = () => {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
    };
    lightbox.querySelector("[data-lightbox-close]").addEventListener("click", close);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && lightbox.classList.contains("open")) close();
    });
  }

  function initVppLaunch() {
    return;
  }

  root.innerHTML = `
    <div class="site-shell">
      ${renderHeader()}
      <main id="main-content">${renderMain()}</main>
      ${renderFooter()}
      ${renderLightbox()}
    </div>
  `;

  initNavigation();
  initContactForm();
  initGallery();
  initLightbox();
  initVppLaunch();
})();
