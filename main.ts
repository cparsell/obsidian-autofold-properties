import { Plugin, MarkdownView } from "obsidian";

export default class AutoCollapseProperties extends Plugin {
  private collapsedFiles = new Set<string>();

  onload() {
    const collapseProps = () => {
      const leaf = this.app.workspace.getMostRecentLeaf();
      if (!leaf || !(leaf.view instanceof MarkdownView)) return;

      const file = leaf.view.file;
      if (!file || this.collapsedFiles.has(file.path)) return;

      const container = leaf.view.contentEl;
      const metadata = container.querySelector(
        ".metadata-container:not(.is-collapsed)"
      );
      if (!metadata) return;

      // Find the collapse indicator inside that block
      const indicator = metadata.querySelector(".collapse-indicator");
      if (indicator instanceof HTMLElement) {
        indicator.click(); // Simulate user click to properly toggle collapsed state
        this.collapsedFiles.add(file.path); // Mark this file as collapsed
      }
    };

    this.registerEvent(this.app.workspace.on("file-open", collapseProps));
    this.registerEvent(this.app.workspace.on("layout-change", collapseProps));
    this.app.workspace.onLayoutReady(collapseProps);
  }
}
