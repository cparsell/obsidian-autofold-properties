import { Plugin, MarkdownView, TFile, Notice } from "obsidian";

/* ───────────────────────── Settings ────────────────────────── */
interface PropStateSettings {
  unfolded: string[]; // paths remembered as open
}
const DEFAULT: PropStateSettings = { unfolded: [] };
const DEBUG = false;

/* ───────────────────────── Plugin ──────────────────────────── */
export default class RememberProperties extends Plugin {
  private settings!: PropStateSettings;
  private suppress = new Set<string>(); // ignore our own unfold click

  /* ── lifecycle ───────────────────────────────────────────── */
  async onload() {
    this.settings = Object.assign({}, DEFAULT, await this.loadData());

    /* 1️⃣ run when a file is newly opened */
    this.registerEvent(
      this.app.workspace.on("file-open", () => this.maybeUnfold())
    );

    /* 2️⃣ run when a pane (leaf) becomes active – covers Cmd+Shift+T */
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.maybeUnfold())
    );

    /* first load */
    this.app.workspace.onLayoutReady(() => this.maybeUnfold());

    /* track manual fold / unfold clicks */
    this.registerDomEvent(document, "click", (e) => this.onHeadingClick(e));
  }

  onunload() {
    this.saveData(this.settings);
  }

  /* ── Step 1 – auto-unfold if remembered ──────────────────── */
  private maybeUnfold() {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (!leaf || !(leaf.view instanceof MarkdownView)) return;

    const file = leaf.view.file;
    if (!file || !this.isRemembered(file)) {
      if (DEBUG)
        new Notice("This file is remembered as folded: " + file?.basename);
      return;
    }

    // ✅ narrow once and reuse
    const view = leaf.view as MarkdownView;

    /* Wait one frame so Obsidian has inserted the container */
    requestAnimationFrame(() => {
      const container = view.contentEl.querySelector(
        ".metadata-container.is-collapsed"
      );
      if (!container) return;

      const heading = container.querySelector(
        ".metadata-properties-heading"
      ) as HTMLElement | null;
      if (!heading) return;

      this.suppress.add(file.path); // ignore the click we create
      heading.click();
      if (DEBUG)
        new Notice("Clicked to unfold properties for " + file.basename);
    });
  }

  /* ── Step 2 – detect user folding / unfolding ────────────── */
  private onHeadingClick(evt: MouseEvent) {
    const heading = (evt.target as HTMLElement).closest(
      ".metadata-properties-heading"
    );
    if (!heading) return;

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;
    const file = view.file;
    if (!file) return;

    /* Ignore the programmatic click from maybeUnfold() */
    if (this.suppress.delete(file.path)) return;

    const container = heading.closest(".metadata-container");
    if (!container) return;

    /* Wait for Obsidian to finish toggling the class */
    requestAnimationFrame(() => {
      const collapsed = container.classList.contains("is-collapsed");
      if (collapsed) {
        this.forget(file); // user folded
      } else {
        this.remember(file); // user unfolded
      }
    });
  }

  /* ── Helpers: remember / forget paths ─────────────────────── */
  private remember(file: TFile) {
    if (!this.settings.unfolded.includes(file.path)) {
      this.settings.unfolded.push(file.path);
      this.saveData(this.settings);
    }
  }
  private forget(file: TFile) {
    const i = this.settings.unfolded.indexOf(file.path);
    if (i !== -1) {
      this.settings.unfolded.splice(i, 1);
      this.saveData(this.settings);
    }
  }
  private isRemembered(file: TFile) {
    return this.settings.unfolded.includes(file.path);
  }
}
